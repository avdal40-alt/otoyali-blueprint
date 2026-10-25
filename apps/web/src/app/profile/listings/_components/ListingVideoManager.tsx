"use client";

import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/i18n/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getMyListingsCopy } from "../my-listings-copy";

type Dto = {
  management: { canUpload: boolean; canReplace: boolean; canRemove: boolean };
  video: null | { state: string; isPublic: boolean };
};

type VideoOperation = "create" | "replace" | "remove";

export function ListingVideoManager({ listingId, title }: { listingId: string; title: string }) {
  const { locale } = useI18n();
  const t = getMyListingsCopy(locale);
  const file = useRef<HTMLInputElement>(null);
  const [dto, setDto] = useState<Dto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<VideoOperation | null>(null);
  const inputId = `video-file-${listingId}`;
  const errorId = `video-error-${listingId}`;

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error();
      const response = await fetch(`/api/listings/${listingId}/video`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json();
      if (!response.ok) throw new Error();
      setDto(payload.data);
    } catch {
      setError(t.videoManagerLoadError);
    } finally {
      setLoading(false);
    }
  };

  const pick = (operation: Extract<VideoOperation, "create" | "replace">) => {
    if (!dto) return void load();
    file.current?.setAttribute("data-operation", operation);
    file.current?.click();
  };

  const submit = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    const operation = (event.target.getAttribute("data-operation") || "create") as Extract<VideoOperation, "create" | "replace">;
    if (!selectedFile) return;
    if (!["video/mp4", "video/webm", "video/quicktime"].includes(selectedFile.type)) return setError(t.videoManagerFormat);
    if (selectedFile.size > 104857600) return setError(t.videoManagerSize);

    setBusy(operation);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      if (!token) throw new Error();
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      const intentResponse = await fetch(`/api/listings/${listingId}/video/upload-intent`, {
        method: "POST",
        headers,
        body: JSON.stringify({ mimeType: selectedFile.type, sizeBytes: selectedFile.size, operation })
      });
      const intentPayload = await intentResponse.json();
      if (!intentResponse.ok) throw new Error();
      if ((await supabase.storage.from("listing-videos").uploadToSignedUrl(intentPayload.data.path, intentPayload.data.token, selectedFile, { contentType: selectedFile.type })).error) throw new Error();
      const durationSeconds = await new Promise<number>((resolve, reject) => {
        const video = document.createElement("video");
        video.onloadedmetadata = () => resolve(Math.max(1, Math.round(video.duration)));
        video.onerror = reject;
        video.src = URL.createObjectURL(selectedFile);
      });
      const finalizeResponse = await fetch(`/api/listings/${listingId}/video/finalize`, {
        method: "POST",
        headers,
        body: JSON.stringify({ intentId: intentPayload.data.intentId, title, description: null, durationSeconds, operation })
      });
      const finalizePayload = await finalizeResponse.json();
      if (!finalizeResponse.ok) {
        if (finalizePayload.cleanupIncomplete) setError(t.videoManagerCleanup);
        throw new Error();
      }
      await load();
    } catch {
      setError((current) => current || t.videoManagerFailed);
    } finally {
      setBusy(null);
      event.target.value = "";
    }
  };

  const remove = async () => {
    setBusy("remove");
    try {
      const supabase = getSupabaseBrowserClient();
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const response = await fetch(`/api/listings/${listingId}/video/remove`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json();
      if (!response.ok) throw new Error();
      if (payload.data.cleanupIncomplete) setError(t.videoManagerCleanup);
      await load();
    } catch {
      setError(t.videoManagerFailed);
    } finally {
      setBusy(null);
    }
  };

  if (!dto && !loading && !error) return <Button type="button" variant="secondary" onClick={load}>{t.videoManagerVideo}</Button>;

  const state = loading
    ? t.videoManagerLoading
    : dto?.video
      ? dto.video.state === "rejected"
        ? t.videoManagerRejected
        : dto.video.state === "pending"
          ? t.videoManagerPending
          : dto.video.isPublic
            ? `${t.videoManagerApproved} · ${t.videoManagerPublic}`
            : t.videoManagerHidden
      : t.videoManagerNone;

  return (
    <section className="mt-3 rounded-md border border-oto-border p-3">
      <label htmlFor={inputId} className="sr-only">{t.videoManagerUpload}</label>
      <input id={inputId} ref={file} aria-describedby={error ? errorId : undefined} className="sr-only" type="file" accept="video/mp4,video/webm,video/quicktime" onChange={submit} />
      <p role="status" aria-live="polite" className="text-sm font-bold">{state}</p>
      {error ? <p id={errorId} role="alert" className="mt-2 text-sm text-red-600">{error}</p> : null}
      {error ? <Button type="button" variant="secondary" onClick={load}>{t.videoManagerRetry}</Button> : null}
      <div className="mt-2 flex gap-2">
        {dto?.management.canUpload ? <Button type="button" disabled={!!busy} onClick={() => pick("create")}>{busy === "create" ? t.videoManagerUploading : t.videoManagerUpload}</Button> : null}
        {dto?.management.canReplace ? <Button type="button" variant="secondary" disabled={!!busy} onClick={() => pick("replace")}>{busy === "replace" ? t.videoManagerReplacing : t.videoManagerReplace}</Button> : null}
        {dto?.management.canRemove ? <Button type="button" variant="secondary" disabled={!!busy} onClick={remove}>{busy === "remove" ? t.videoManagerRemoving : t.videoManagerRemove}</Button> : null}
      </div>
      {dto && !dto.management.canUpload && !dto.management.canReplace && !dto.management.canRemove ? <p className="mt-2 text-xs text-oto-muted">{t.videoManagerVerified}</p> : null}
    </section>
  );
}
