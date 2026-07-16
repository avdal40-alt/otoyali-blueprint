"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { getBestImageUrl, type ImageSource, type ImageVariant } from "@/lib/media/image-variants";

export function SafeImage({
  src,
  media,
  variant = "card",
  alt,
  className,
  fallbackClassName,
  priority = false,
  width,
  height
}: {
  src?: string | null;
  media?: ImageSource | null;
  variant?: ImageVariant;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  priority?: boolean;
  width?: number;
  height?: number;
}) {
  const [failed, setFailed] = useState(false);
  const cleanSrc = (src?.trim() || getBestImageUrl(media, variant))?.trim();

  if (!cleanSrc || failed) {
    return <ImagePlaceholder className={fallbackClassName} />;
  }

  return (
    <img
      src={cleanSrc}
      alt={alt}
      className={cn("h-full w-full object-cover", className)}
      onError={() => setFailed(true)}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      width={width}
      height={height}
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
