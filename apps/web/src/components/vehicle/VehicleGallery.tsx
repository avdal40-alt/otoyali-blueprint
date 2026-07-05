"use client";

import { useState } from "react";
import type { ListingMedia } from "@/lib/supabase/types";
import { SafeImage } from "@/components/ui/SafeImage";
import { cn } from "@/lib/cn";

export function VehicleGallery({ media, title, fallbackImageUrl }: { media: ListingMedia[]; title: string; fallbackImageUrl?: string | null }) {
  const images = getGalleryImages(media, fallbackImageUrl);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex] ?? images[0];

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-oto bg-oto-surface md:aspect-[21/9]">
        <SafeImage src={activeImage?.url} alt={title} fallbackClassName="text-lg" />
        {images.length > 0 ? (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-black text-white">
            {activeIndex + 1}/{images.length} fotoğraf
          </span>
        ) : null}
      </div>
      {images.length > 1 ? (
        <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1">
          {images.map((item, index) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                "aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-md border bg-oto-surface transition",
                index === activeIndex ? "border-oto-blue ring-2 ring-blue-100" : "border-oto-border hover:border-oto-blue"
              )}
              aria-label={`${index + 1}. fotoğrafı göster`}
            >
              <SafeImage src={item.url} alt={title} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getGalleryImages(media: ListingMedia[], fallbackImageUrl?: string | null) {
  const images = media
    .map((item) => ({
      key: item.media_id ?? item.url ?? item.storage_path ?? "",
      url: item.url
    }))
    .filter((item) => item.url);

  if (images.length === 0 && fallbackImageUrl) {
    return [{ key: fallbackImageUrl, url: fallbackImageUrl }];
  }

  return images;
}
