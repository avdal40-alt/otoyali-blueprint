"use client";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";

export function PublicVideoPlayer({ src, poster, errorLabel, retryLabel }: { src?: string; poster?: string; errorLabel: string; retryLabel: string }) {
  const video = useRef<HTMLVideoElement>(null); const [failed, setFailed] = useState(false);
  if (!src || failed) return <div className="grid aspect-[9/16] place-items-center gap-3 bg-oto-surface p-4 text-center text-sm font-semibold text-oto-muted"><span>{errorLabel}</span>{src ? <Button type="button" variant="secondary" onClick={() => { setFailed(false); requestAnimationFrame(() => video.current?.load()); }}>{retryLabel}</Button> : null}</div>;
  return <video ref={video} className="aspect-[9/16] w-full bg-black object-contain" controls playsInline preload="none" poster={poster} src={src} onError={() => setFailed(true)} />;
}
