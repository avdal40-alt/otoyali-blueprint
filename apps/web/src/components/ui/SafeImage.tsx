"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { getBestImageUrl, getResponsiveImageSrcSet, type ImageSource, type ImageVariant } from "@/lib/media/image-variants";

const defaultSizes: Record<ImageVariant, string> = {
  thumb: "96px",
  card: "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw",
  large: "(max-width: 767px) 100vw, (max-width: 1279px) 67vw, 960px",
  original: "100vw"
};

export function SafeImage({
  src,
  media,
  variant = "card",
  alt,
  className,
  fallbackClassName,
  priority = false,
  width,
  height,
  sizes
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
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const cleanSrc = (src?.trim() || getBestImageUrl(media, variant))?.trim();
  const srcSet = getResponsiveImageSrcSet(media, variant);

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
      srcSet={srcSet}
      sizes={srcSet ? (sizes ?? defaultSizes[variant]) : undefined}
    />
  );
}

export function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-full w-full items-center justify-center bg-oto-surface text-sm font-black text-oto-muted", className)}>
      Jolcar
    </div>
  );
}
