"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { cityLabel, formatPrice } from "@/lib/format";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SafeImage } from "@/components/ui/SafeImage";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { localizePath } from "@/i18n/config";
import type { Locale } from "@/i18n/types";
import { getBestImageUrl, isImageProcessingFailed } from "@/lib/media/image-variants";
import { getMyListingsCopy, getMyListingsLifecycleErrorMessage, type MyListingsCopy } from "../my-listings-copy";

type MyListing = {
  id: string;
  vehicle_profile_id: string;
  title: string;
  status: string;
  moderation_status?: string | null;
  rejection_reason?: string | null;
  moderation_note?: string | null;
  price_amount: number;
  currency: string;
  city: string;
  quality_score?: number | null;
  make_name?: string | null;
  model_name?: string | null;
  year?: number | null;
  cover_image_url?: string | null;
  media_processed_status?: string | null;
};

const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

type OwnerLifecycleAction = "submit" | "resubmit" | "pause" | "archive";

type ListingWorkflowOutcome =
  | { kind: "mutation-failed"; error: unknown }
  | { kind: "mutation-succeeded" }
  | { kind: "mutation-succeeded-refresh-failed"; error: unknown };

const ownerLifecycleRpc: Record<OwnerLifecycleAction, string> = {
  submit: "submit_own_listing_for_review",
  resubmit: "resubmit_own_listing_for_review",
  pause: "pause_own_listing",
  archive: "archive_own_listing"
};

export function MyListingsClient({ locale }: { locale: Locale }) {
  const router = useRouter();
  const copy = getMyListingsCopy(locale);
  const [items, setItems] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [actionListingId, setActionListingId] = useState<string | null>(null);
  const actionInFlight = useRef<string | null>(null);
  const mounted = useRef(false);
  const listingLoadGeneration = useRef(0);
  const [videoListingId, setVideoListingId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoSuccess, setVideoSuccess] = useState<string | null>(null);

  const loadListings = useCallback(async function loadListings() {
    const loadGeneration = ++listingLoadGeneration.current;
    const isCurrentLoad = () => mounted.current && listingLoadGeneration.current === loadGeneration;

    if (!isCurrentLoad()) return;

    try {
      if (!hasSupabaseEnv()) {
        if (isCurrentLoad()) {
          setError(copy.missingSupabaseEnv);
          setLoading(false);
        }
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!isCurrentLoad()) return;
      if (!userData.user) {
        router.replace(`${localizePath("/login", locale)}?next=${encodeURIComponent(localizePath("/my-listings", locale))}`);
        return;
      }
      setUserId(userData.user.id);

      const { data, error: listingError } = await supabase
        .schema("marketplace")
        .from("listings")
        .select("id,vehicle_profile_id,title,status,moderation_status,rejection_reason,moderation_note,price_amount,currency,city,quality_score")
        .eq("seller_id", userData.user.id)
        .limit(50)
        .order("created_at", { ascending: false });

      if (!isCurrentLoad()) return;
      if (listingError) {
        logClientError("myListings.load", listingError);
        setError(listingLoadErrorMessage(locale));
        setLoading(false);
        return;
      }

      const listingRows = (data ?? []) as MyListing[];
      const profileIds = listingRows.map((item) => item.vehicle_profile_id).filter(Boolean);
      if (profileIds.length === 0) {
        setItems(listingRows);
        setLoading(false);
        return;
      }

      const [{ data: profiles }, { data: media }] = await Promise.all([
        supabase
          .schema("vehicle")
          .from("vehicle_profiles")
          .select("id,make_id,model_id,year")
          .in("id", profileIds),
        supabase
          .schema("vehicle")
          .from("profile_media")
          .select("vehicle_profile_id,url,thumb_url,card_url,large_url,processed_status,is_cover,sort_order")
          .in("vehicle_profile_id", profileIds)
          .order("is_cover", { ascending: false })
          .order("sort_order", { ascending: true })
      ]);

      if (!isCurrentLoad()) return;
      const profileRows = (profiles ?? []) as Array<{ id: string; make_id: string; model_id: string; year: number | null }>;
      const makeIds = Array.from(new Set(profileRows.map((profile) => profile.make_id).filter(Boolean)));
      const modelIds = Array.from(new Set(profileRows.map((profile) => profile.model_id).filter(Boolean)));
      const [{ data: makes }, { data: models }] = await Promise.all([
        makeIds.length > 0 ? supabase.schema("vehicle").from("makes").select("id,name").in("id", makeIds) : Promise.resolve({ data: [] }),
        modelIds.length > 0 ? supabase.schema("vehicle").from("models").select("id,name").in("id", modelIds) : Promise.resolve({ data: [] })
      ]);

      if (!isCurrentLoad()) return;
      const profilesById = new Map(profileRows.map((profile) => [profile.id, profile]));
      const makesById = new Map(((makes ?? []) as Array<{ id: string; name: string }>).map((make) => [make.id, make.name]));
      const modelsById = new Map(((models ?? []) as Array<{ id: string; name: string }>).map((model) => [model.id, model.name]));
      const mediaByProfile = new Map<string, { url: string; processed_status?: string | null }>();
      for (const item of (media ?? []) as Array<{ vehicle_profile_id: string; url: string | null; thumb_url?: string | null; card_url?: string | null; large_url?: string | null; processed_status?: string | null }>) {
        const bestUrl = getBestImageUrl(item, "thumb");
        if (bestUrl && !mediaByProfile.has(item.vehicle_profile_id)) {
          mediaByProfile.set(item.vehicle_profile_id, { url: bestUrl, processed_status: item.processed_status });
        }
      }

      setItems(
        listingRows.map((item) => {
          const profile = profilesById.get(item.vehicle_profile_id);
          return {
            ...item,
            make_name: profile?.make_id ? makesById.get(profile.make_id) : null,
            model_name: profile?.model_id ? modelsById.get(profile.model_id) : null,
            year: profile?.year ?? null,
            cover_image_url: mediaByProfile.get(item.vehicle_profile_id)?.url ?? null,
            media_processed_status: mediaByProfile.get(item.vehicle_profile_id)?.processed_status ?? null
          };
        })
      );
      setLoading(false);
    } catch (loadError) {
      if (isCurrentLoad()) throw loadError;
    }
  }, [router, locale, copy.missingSupabaseEnv]);

  useEffect(() => {
    mounted.current = true;
    void loadListings().catch((loadError) => {
      if (!mounted.current) return;
      logClientError("myListings.load", loadError);
      setError(listingLoadErrorMessage(locale));
      setLoading(false);
    });

    return () => {
      mounted.current = false;
      listingLoadGeneration.current += 1;
    };
  }, [loadListings, locale]);

  async function runListingWorkflow(listingId: string, action: OwnerLifecycleAction) {
    if (actionInFlight.current !== null) return;

    const supabase = getSupabaseBrowserClient();
    setError(null);
    actionInFlight.current = listingId;
    setActionListingId(listingId);
    try {
      const outcome = await resolveListingWorkflow(
        () => supabase.rpc(ownerLifecycleRpc[action], { p_listing_id: listingId }),
        loadListings
      );

      if (outcome.kind === "mutation-failed") {
        logClientError("myListings.runWorkflow", outcome.error);
        if (mounted.current) setError(lifecycleErrorMessage(outcome.error, locale));
      } else if (outcome.kind === "mutation-succeeded-refresh-failed") {
        logClientError("myListings.refreshAfterWorkflow", outcome.error);
        if (mounted.current) setError(listingLoadErrorMessage(locale));
      }
    } finally {
      if (actionInFlight.current === listingId) {
        actionInFlight.current = null;
        if (mounted.current) setActionListingId(null);
      }
    }
  }

  function openVideoForm(item: MyListing) {
    if (videoListingId === item.id) {
      resetVideoForm();
      return;
    }

    setVideoListingId(item.id);
    setVideoTitle(item.title);
    setVideoDescription("");
    setVideoFile(null);
    setVideoError(null);
    setVideoSuccess(null);
  }

  function resetVideoForm() {
    setVideoListingId(null);
    setVideoTitle("");
    setVideoDescription("");
    setVideoFile(null);
    setVideoError(null);
    setVideoSuccess(null);
    setVideoUploading(false);
  }

  function handleVideoFile(event: ChangeEvent<HTMLInputElement>) {
    setVideoError(null);
    setVideoSuccess(null);
    setVideoFile(event.target.files?.[0] ?? null);
  }

  async function submitVideo(event: FormEvent<HTMLFormElement>, item: MyListing) {
    event.preventDefault();
    setVideoError(null);
    setVideoSuccess(null);

    if (!userId) {
      setVideoError(copy.videoLoginRequired);
      return;
    }

    if (!videoFile) {
      setVideoError(copy.videoFileRequired);
      return;
    }

    if (!ALLOWED_VIDEO_TYPES.has(videoFile.type)) {
      setVideoError(copy.videoUploadFailure);
      return;
    }

    if (videoFile.size > MAX_VIDEO_SIZE_BYTES) {
      setVideoError(copy.videoTooLarge);
      return;
    }

    setVideoUploading(true);
    try {
      const duration = await getVideoDuration(videoFile);
      if (!Number.isFinite(duration) || duration <= 0) {
        setVideoError(copy.videoUploadFailure);
        setVideoUploading(false);
        return;
      }

      if (duration > 60) {
        setVideoError(copy.videoTooLong);
        setVideoUploading(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const storagePath = `${userId}/${item.id}/${Date.now()}-${safeFileName(videoFile.name)}`;
      const { error: uploadError } = await supabase.storage
        .from("listing-videos")
        .upload(storagePath, videoFile, {
          cacheControl: "3600",
          contentType: videoFile.type,
          upsert: false
        });

      if (uploadError) {
        setVideoError(copy.videoUploadFailure);
        setVideoUploading(false);
        return;
      }

      const { data: publicUrl } = supabase.storage.from("listing-videos").getPublicUrl(storagePath);
      const { error: insertError } = await supabase
        .schema("marketplace")
        .from("listing_videos")
        .insert({
          listing_id: item.id,
          seller_user_id: userId,
          title: videoTitle.trim() || item.title,
          description: videoDescription.trim() || null,
          video_url: publicUrl.publicUrl,
          original_video_url: publicUrl.publicUrl,
          storage_path: storagePath,
          duration_seconds: Math.max(1, Math.round(duration)),
          status: "pending_review",
          visibility: "public",
          processing_status: "skipped",
          blur_status: "not_started",
          moderation_status: "pending_review"
        });

      if (insertError) {
        setVideoError(copy.videoUploadFailure);
        setVideoUploading(false);
        return;
      }

      setVideoFile(null);
      setVideoSuccess(copy.videoSuccess);
    } catch {
      setVideoError(copy.videoUploadFailure);
    } finally {
      setVideoUploading(false);
    }
  }

  if (loading) return <LoadingState label={copy.loading} />;
  if (error) return <ErrorState message={error} />;
  if (items.length === 0) {
    return (
      <EmptyState
        title={copy.emptyTitle}
        body={copy.emptyBody}
        href={localizePath("/sell", locale)}
        action={copy.publishListing}
      />
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((item) => {
        const workflow = statusMeta(item, copy);
        const canViewPublic = item.status === "active" && item.moderation_status === "active";
        const canSubmit = item.status === "draft" && item.moderation_status !== "pending_review";
        const canResubmit = item.moderation_status === "rejected";
        const canPause = canViewPublic;
        const canArchive = item.status !== "removed" && item.moderation_status !== "archived";
        const actionBusy = actionListingId === item.id;
        const anyActionBusy = Boolean(actionListingId);

        return (
        <article key={item.id} className="overflow-hidden rounded-oto border border-oto-border bg-white shadow-soft">
          <div className="grid gap-4 p-3 sm:grid-cols-[180px_1fr]">
            <div className="aspect-[4/3] overflow-hidden rounded-md bg-oto-surface">
              <SafeImage src={item.cover_image_url} alt={item.title} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${workflow.className}`}>{workflow.label}</p>
                  <h2 className="mt-1 text-lg font-black text-oto-text">{item.title}</h2>
                  <p className="mt-1 text-sm font-semibold text-oto-muted">
                    {[item.make_name, item.model_name, item.year].filter(Boolean).join(" ") || copy.vehicleInformation}
                  </p>
                </div>
                <p className="text-lg font-black text-oto-text">{formatPrice(item.price_amount, item.currency, locale)}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-oto-muted">
                <span className="rounded-full bg-oto-surface px-3 py-1">{cityLabel(item.city, locale)}</span>
                <span className="rounded-full bg-oto-surface px-3 py-1">{copy.listingQuality}: {item.quality_score ?? 0}%</span>
                {item.media_processed_status ? (
                  <span className="rounded-full bg-oto-surface px-3 py-1">
                    {copy.image}: {isImageProcessingFailed({ processed_status: item.media_processed_status }) ? copy.imageError : item.media_processed_status}
                  </span>
                ) : null}
              </div>
              {workflow.body ? (
                <p className="mt-3 rounded-md bg-oto-surface p-3 text-sm font-semibold leading-6 text-oto-muted">{workflow.body}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {canViewPublic ? (
                  <ButtonLink href={localizePath(`/listing/${item.id}`, locale)} variant="secondary">{copy.view}</ButtonLink>
                ) : (
                  <Button type="button" variant="secondary" disabled>{copy.previewComingSoon}</Button>
                )}
                {item.moderation_status === "rejected" ? (
                  <ButtonLink href={localizePath(`/sell?edit=${item.id}`, locale)} variant="secondary">{copy.editRejected}</ButtonLink>
                ) : (
                  <Button type="button" variant="secondary" disabled>{copy.editComingSoon}</Button>
                )}
                {canSubmit ? (
                  <Button type="button" variant="secondary" disabled={anyActionBusy} onClick={() => runListingWorkflow(item.id, "submit")}>
                    {actionBusy ? copy.sending : copy.submitForReview}
                  </Button>
                ) : null}
                {canResubmit ? (
                  <Button type="button" variant="secondary" disabled={anyActionBusy} onClick={() => runListingWorkflow(item.id, "resubmit")}>
                    {actionBusy ? copy.sending : copy.resubmitForReview}
                  </Button>
                ) : null}
                {canPause ? (
                  <Button type="button" variant="secondary" disabled={anyActionBusy} onClick={() => runListingWorkflow(item.id, "pause")}>
                    {actionBusy ? copy.pausing : copy.pause}
                  </Button>
                ) : null}
                {canArchive ? (
                  <Button type="button" variant="secondary" disabled={anyActionBusy} onClick={() => runListingWorkflow(item.id, "archive")}>
                    {actionBusy ? copy.archiving : copy.archive}
                  </Button>
                ) : null}
                {canViewPublic ? <Button type="button" variant="secondary" onClick={() => openVideoForm(item)}>{copy.addVideo}</Button> : null}
              </div>
              {videoListingId === item.id ? (
                <form className="mt-4 rounded-md border border-oto-border bg-oto-surface p-4" onSubmit={(event) => submitVideo(event, item)}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-oto-text">{copy.addVideo}</h3>
                      <p className="mt-1 text-xs font-bold leading-5 text-oto-muted">{copy.videoIntro}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-oto-muted">{copy.videoPending}</span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <label className="grid gap-1 text-sm font-bold text-oto-text">
                      {copy.videoTitle}
                      <input
                        value={videoTitle}
                        onChange={(event) => setVideoTitle(event.target.value)}
                        className="h-11 rounded-md border border-oto-border bg-white px-3 text-sm font-semibold outline-none focus:border-oto-blue"
                        maxLength={120}
                        required
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold text-oto-text">
                      {copy.videoDescription}
                      <textarea
                        value={videoDescription}
                        onChange={(event) => setVideoDescription(event.target.value)}
                        className="min-h-24 rounded-md border border-oto-border bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-oto-blue"
                        maxLength={500}
                        placeholder={copy.videoDescriptionPlaceholder}
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold text-oto-text">
                      {copy.videoFile}
                      <input
                        key={videoSuccess ?? videoListingId}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        onChange={handleVideoFile}
                        className="rounded-md border border-dashed border-oto-border bg-white p-3 text-sm font-semibold text-oto-muted"
                        required
                      />
                    </label>
                    <p className="text-xs font-semibold leading-5 text-oto-muted">{copy.videoRequirements}</p>
                    <p className="text-xs font-semibold leading-5 text-oto-muted">{copy.videoModerationHelp}</p>
                    {videoError ? <p className="rounded-md bg-red-50 p-3 text-sm font-bold text-oto-danger">{videoError}</p> : null}
                    {videoSuccess ? <p className="rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{videoSuccess}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" disabled={videoUploading}>
                        {videoUploading ? copy.uploading : copy.submitForReview}
                      </Button>
                      <Button type="button" variant="secondary" onClick={resetVideoForm} disabled={videoUploading}>
                        {copy.close}
                      </Button>
                    </div>
                  </div>
                </form>
              ) : null}
            </div>
          </div>
        </article>
        );
      })}
      <div>
        <Link href={localizePath("/sell", locale)} className="text-sm font-black text-oto-blue">{copy.publishListing}</Link>
      </div>
    </div>
  );
}

function statusMeta(item: MyListing, copy: MyListingsCopy) {
  if (item.moderation_status === "pending_review") {
    return {
      label: copy.statusPendingReview,
      className: "bg-amber-50 text-amber-700",
      body: copy.statusPendingReviewBody
    };
  }

  if (item.moderation_status === "rejected") {
    return {
      label: copy.statusRejected,
      className: "bg-red-50 text-oto-danger",
      body: item.rejection_reason || item.moderation_note || copy.statusRejectedBody
    };
  }

  if (item.moderation_status === "archived" || item.status === "removed") {
    return {
      label: copy.statusArchived,
      className: "bg-oto-surface text-oto-muted",
      body: copy.statusArchivedBody
    };
  }

  if (item.status === "active" && item.moderation_status === "active") {
    return {
      label: copy.statusActive,
      className: "bg-emerald-50 text-emerald-700",
      body: null
    };
  }

  if (item.status === "paused") {
    return {
      label: copy.statusPaused,
      className: "bg-oto-surface text-oto-muted",
      body: copy.statusPausedBody
    };
  }

  if (item.status === "sold") {
    return {
      label: copy.statusSold,
      className: "bg-oto-surface text-oto-muted",
      body: copy.statusSoldBody
    };
  }

  return {
    label: copy.statusDraft,
    className: "bg-oto-surface text-oto-muted",
    body: copy.statusDraftBody
  };
}

function lifecycleErrorMessage(error: unknown, locale: string) {
  return getMyListingsLifecycleErrorMessage(error, getMyListingsCopy(locale));
}

function listingLoadErrorMessage(locale: string) {
  return getMyListingsCopy(locale).loadFailure;
}

export async function resolveListingWorkflow(
  runMutation: () => PromiseLike<{ error: unknown }>,
  refreshListings: () => Promise<void>
): Promise<ListingWorkflowOutcome> {
  try {
    const { error } = await runMutation();
    if (error) return { kind: "mutation-failed", error };
  } catch (error) {
    return { kind: "mutation-failed", error };
  }

  try {
    await refreshListings();
    return { kind: "mutation-succeeded" };
  } catch (error) {
    return { kind: "mutation-succeeded-refresh-failed", error };
  }
}

function logClientError(context: string, detail: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[${context}]`, detail);
  }
}

function getVideoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Video metadata could not be loaded"));
    };

    video.src = url;
  });
}

function safeFileName(fileName: string) {
  const parts = fileName.split(".");
  const extension = parts.length > 1 ? parts.pop() : "mp4";
  const base = parts.join(".") || "video";
  return `${base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "video"}.${extension?.toLowerCase() || "mp4"}`;
}
