"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type EventType = "video_impression" | "video_play" | "video_complete" | "video_error";
type ErrorCode = "aborted" | "network" | "decode" | "source_not_supported" | "unknown";

export function PublicVideoPlayer({ src, poster, listingId, videoId, locale, errorLabel, retryLabel }: { src?: string; poster?: string; listingId?: string | null; videoId?: string | null; locale: "tr" | "en"; errorLabel: string; retryLabel: string }) {
  const video = useRef<HTMLVideoElement>(null); const emitted = useRef(new Set<string>()); const errorAttempt = useRef(0); const [failed, setFailed] = useState(false);
  const emit = useCallback(async (eventType: EventType, errorCode: ErrorCode | null = null, key: string = eventType) => {
    if (!listingId || !videoId) return;
    if (emitted.current.has(key)) return; emitted.current.add(key);
    const session = (await getSupabaseBrowserClient().auth.getSession()).data.session;
    if (!session?.access_token) return;
    await fetch("/api/analytics/video", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ eventType, listingId, videoId, context: "video_feed", locale, errorCode, dedupKey: crypto.randomUUID() }) }).catch(() => undefined);
  }, [listingId, locale, videoId]);
  const errorCode = (): ErrorCode => (new Map<number, ErrorCode>([[1, "aborted"], [2, "network"], [3, "decode"], [4, "source_not_supported"]]).get(video.current?.error?.code ?? 0) ?? "unknown");
  useEffect(() => { const node = video.current; if (!node || !src) return; const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)) { void emit("video_impression"); observer.disconnect(); } }, { threshold: 0.5 }); observer.observe(node); return () => observer.disconnect(); }, [emit, src]);
  if (!src || failed) return <div className="grid aspect-[9/16] place-items-center gap-3 bg-oto-surface p-4 text-center text-sm font-semibold text-oto-muted"><span>{errorLabel}</span>{src ? <Button type="button" variant="secondary" onClick={() => { errorAttempt.current += 1; setFailed(false); requestAnimationFrame(() => video.current?.load()); }}>{retryLabel}</Button> : null}</div>;
  return <video ref={video} className="aspect-[9/16] w-full bg-black object-contain" controls playsInline preload="none" poster={poster} src={src} onPlay={() => void emit("video_play")} onEnded={() => void emit("video_complete")} onError={() => { void emit("video_error", errorCode(), `video_error:${errorAttempt.current}`); setFailed(true); }} />;
}
