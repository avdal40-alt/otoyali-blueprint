"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

export function SafeImage({
  src,
  alt,
  className,
  fallbackClassName
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const cleanSrc = src?.trim();

  if (!cleanSrc || failed) {
    return <ImagePlaceholder className={fallbackClassName} />;
  }

  return (
    <img
      src={cleanSrc}
      alt={alt}
      className={cn("h-full w-full object-cover", className)}
      onError={() => setFailed(true)}
      loading="lazy"
    />
  );
}

export function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-oto-surface text-sm font-black text-oto-muted", className)}>
      OTOYALI
    </div>
  );
}
