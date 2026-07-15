"use client";

import type { ChangeEvent, FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { cityLabel, formatPrice } from "@/lib/format";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SafeImage } from "@/components/ui/SafeImage";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";

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
};

const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

export function MyListingsClient() {
  const router = useRouter();
  const [items, setItems] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [videoListingId, setVideoListingId] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoSuccess, setVideoSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!hasSupabaseEnv()) {
        setError("Supabase ortam değişkenleri eksik.");
        setLoading(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login?next=/my-listings");
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

      if (listingError) {
        logClientError("myListings.load", listingError);
        setError("İlanlarınız yüklenemedi. Lütfen tekrar deneyin.");
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
          .select("vehicle_profile_id,url,is_cover,sort_order")
          .in("vehicle_profile_id", profileIds)
          .order("is_cover", { ascending: false })
          .order("sort_order", { ascending: true })
      ]);

      const profileRows = (profiles ?? []) as Array<{ id: string; make_id: string; model_id: string; year: number | null }>;
      const makeIds = Array.from(new Set(profileRows.map((profile) => profile.make_id).filter(Boolean)));
      const modelIds = Array.from(new Set(profileRows.map((profile) => profile.model_id).filter(Boolean)));
      const [{ data: makes }, { data: models }] = await Promise.all([
        makeIds.length > 0 ? supabase.schema("vehicle").from("makes").select("id,name").in("id", makeIds) : Promise.resolve({ data: [] }),
        modelIds.length > 0 ? supabase.schema("vehicle").from("models").select("id,name").in("id", modelIds) : Promise.resolve({ data: [] })
      ]);

      const profilesById = new Map(profileRows.map((profile) => [profile.id, profile]));
      const makesById = new Map(((makes ?? []) as Array<{ id: string; name: string }>).map((make) => [make.id, make.name]));
      const modelsById = new Map(((models ?? []) as Array<{ id: string; name: string }>).map((model) => [model.id, model.name]));
      const mediaByProfile = new Map<string, string>();
      for (const item of (media ?? []) as Array<{ vehicle_profile_id: string; url: string | null }>) {
        if (item.url && !mediaByProfile.has(item.vehicle_profile_id)) {
          mediaByProfile.set(item.vehicle_profile_id, item.url);
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
            cover_image_url: mediaByProfile.get(item.vehicle_profile_id) ?? null
          };
        })
      );
      setLoading(false);
    }

    void load();
  }, [router]);

  async function updateListingWorkflow(
    listingId: string,
    values: { status?: "active" | "paused" | "removed"; moderation_status?: "active" | "archived" }
  ) {
    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase
      .schema("marketplace")
      .from("listings")
      .update(values)
      .eq("id", listingId);

    if (updateError) {
      logClientError("myListings.updateWorkflow", updateError);
      setError("İlan durumu güncellenemedi. Lütfen tekrar deneyin.");
      return;
    }

    setItems((current) => current.map((item) => item.id === listingId ? { ...item, ...values } : item));
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
      setVideoError("Video yüklemek için giriş yapmanız gerekir.");
      return;
    }

    if (!videoFile) {
      setVideoError("Video dosyası seçin.");
      return;
    }

    if (!ALLOWED_VIDEO_TYPES.has(videoFile.type)) {
      setVideoError("Video yüklenemedi. Lütfen tekrar deneyin.");
      return;
    }

    if (videoFile.size > MAX_VIDEO_SIZE_BYTES) {
      setVideoError("Video dosyası çok büyük.");
      return;
    }

    setVideoUploading(true);
    try {
      const duration = await getVideoDuration(videoFile);
      if (!Number.isFinite(duration) || duration <= 0) {
        setVideoError("Video yüklenemedi. Lütfen tekrar deneyin.");
        setVideoUploading(false);
        return;
      }

      if (duration > 60) {
        setVideoError("Video en fazla 60 saniye olabilir.");
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
        setVideoError("Video yüklenemedi. Lütfen tekrar deneyin.");
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
        setVideoError("Video yüklenemedi. Lütfen tekrar deneyin.");
        setVideoUploading(false);
        return;
      }

      setVideoFile(null);
      setVideoSuccess("Videonuz incelenmek üzere alındı.");
    } catch {
      setVideoError("Video yüklenemedi. Lütfen tekrar deneyin.");
    } finally {
      setVideoUploading(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (items.length === 0) return <EmptyState title="Henüz ilanınız yok." body="İlk ilanınızı yayınlayın." href="/sell" action="İlan yayınla" />;

  return (
    <div className="grid gap-4">
      {items.map((item) => {
        const workflow = statusMeta(item);
        const canViewPublic = item.status === "active" && item.moderation_status === "active";

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
                    {[item.make_name, item.model_name, item.year].filter(Boolean).join(" ") || "Araç bilgileri"}
                  </p>
                </div>
                <p className="text-lg font-black text-oto-text">{formatPrice(item.price_amount, item.currency)}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-oto-muted">
                <span className="rounded-full bg-oto-surface px-3 py-1">{cityLabel(item.city)}</span>
                <span className="rounded-full bg-oto-surface px-3 py-1">İlan kalitesi: {item.quality_score ?? 0}%</span>
              </div>
              {workflow.body ? (
                <p className="mt-3 rounded-md bg-oto-surface p-3 text-sm font-semibold leading-6 text-oto-muted">{workflow.body}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {canViewPublic ? (
                  <ButtonLink href={`/listing/${item.id}`} variant="secondary">Görüntüle</ButtonLink>
                ) : (
                  <Button type="button" variant="secondary" disabled>Önizle · Yakında</Button>
                )}
                <Button type="button" variant="secondary" disabled>{item.moderation_status === "rejected" ? "Tekrar düzenle · Yakında" : "Düzenle · Yakında"}</Button>
                {canViewPublic ? (
                  <Button type="button" variant="secondary" onClick={() => updateListingWorkflow(item.id, { status: "paused" })}>Duraklat</Button>
                ) : item.status === "paused" ? (
                  <Button type="button" variant="secondary" onClick={() => updateListingWorkflow(item.id, { status: "active" })}>Yeniden yayınla</Button>
                ) : null}
                {item.status !== "removed" ? (
                  <Button type="button" variant="secondary" onClick={() => updateListingWorkflow(item.id, { status: "removed", moderation_status: "archived" })}>Arşivle</Button>
                ) : null}
                {canViewPublic ? <Button type="button" variant="secondary" onClick={() => openVideoForm(item)}>Video ekle</Button> : null}
              </div>
              {videoListingId === item.id ? (
                <form className="mt-4 rounded-md border border-oto-border bg-oto-surface p-4" onSubmit={(event) => submitVideo(event, item)}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-black text-oto-text">Video ekle</h3>
                      <p className="mt-1 text-xs font-bold leading-5 text-oto-muted">60 saniyeye kadar aracınızı tanıtın.</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-oto-muted">İnceleme bekler</span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <label className="grid gap-1 text-sm font-bold text-oto-text">
                      Video başlığı
                      <input
                        value={videoTitle}
                        onChange={(event) => setVideoTitle(event.target.value)}
                        className="h-11 rounded-md border border-oto-border bg-white px-3 text-sm font-semibold outline-none focus:border-oto-blue"
                        maxLength={120}
                        required
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold text-oto-text">
                      Açıklama
                      <textarea
                        value={videoDescription}
                        onChange={(event) => setVideoDescription(event.target.value)}
                        className="min-h-24 rounded-md border border-oto-border bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-oto-blue"
                        maxLength={500}
                        placeholder="Kısa tanıtım, öne çıkan özellikler veya kullanım notları"
                      />
                    </label>
                    <label className="grid gap-1 text-sm font-bold text-oto-text">
                      Video dosyası
                      <input
                        key={videoSuccess ?? videoListingId}
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        onChange={handleVideoFile}
                        className="rounded-md border border-dashed border-oto-border bg-white p-3 text-sm font-semibold text-oto-muted"
                        required
                      />
                    </label>
                    <p className="text-xs font-semibold leading-5 text-oto-muted">
                      60 saniyeye kadar video yükleyin. Dikey video önerilir. En fazla 100 MB.
                      MP4, WebM veya tarayıcınız destekliyorsa MOV/QuickTime kullanabilirsiniz.
                    </p>
                    <p className="text-xs font-semibold leading-5 text-oto-muted">
                      Video içeriği satıcı tarafından sağlanır. Plakanızı gizlemek istiyorsanız videoyu yüklemeden önce düzenleyebilirsiniz.
                      Yayınlanmadan önce manuel inceleme yapılır.
                    </p>
                    {videoError ? <p className="rounded-md bg-red-50 p-3 text-sm font-bold text-oto-danger">{videoError}</p> : null}
                    {videoSuccess ? <p className="rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{videoSuccess}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" disabled={videoUploading}>
                        {videoUploading ? "Yükleniyor" : "İncelemeye gönder"}
                      </Button>
                      <Button type="button" variant="secondary" onClick={resetVideoForm} disabled={videoUploading}>
                        Kapat
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
        <Link href="/sell" className="text-sm font-black text-oto-blue">Yeni ilan yayınla</Link>
      </div>
    </div>
  );
}

function statusMeta(item: MyListing) {
  if (item.moderation_status === "pending_review") {
    return {
      label: "Onay bekliyor",
      className: "bg-amber-50 text-amber-700",
      body: "İlanınız moderasyon kontrolünde. Onaylandıktan sonra yayına alınacaktır."
    };
  }

  if (item.moderation_status === "rejected") {
    return {
      label: "Reddedildi",
      className: "bg-red-50 text-oto-danger",
      body: item.rejection_reason || item.moderation_note || "İlanınız yayın kurallarına uygun olmadığı için reddedildi."
    };
  }

  if (item.moderation_status === "archived" || item.status === "removed") {
    return {
      label: "Arşivlendi",
      className: "bg-oto-surface text-oto-muted",
      body: "Bu ilan yayından kaldırıldı ve public sayfalarda görünmez."
    };
  }

  if (item.status === "active" && item.moderation_status === "active") {
    return {
      label: "Yayında",
      className: "bg-emerald-50 text-emerald-700",
      body: null
    };
  }

  if (item.status === "paused") {
    return {
      label: "Duraklatıldı",
      className: "bg-oto-surface text-oto-muted",
      body: "İlanınız geçici olarak yayında değil."
    };
  }

  if (item.status === "sold") {
    return {
      label: "Satıldı",
      className: "bg-oto-surface text-oto-muted",
      body: "Bu ilan satıldı olarak işaretlenmiş."
    };
  }

  return {
    label: "Taslak",
    className: "bg-oto-surface text-oto-muted",
    body: "Taslak ilanlar public sayfalarda görünmez."
  };
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
