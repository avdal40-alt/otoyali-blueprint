"use client";

import { useState } from "react";
import type { ListingMedia } from "@/lib/supabase/types";
import { SafeImage } from "@/components/ui/SafeImage";
import { cn } from "@/lib/cn";
import { getBestImageUrl, isImageProcessing, isImageProcessingFailed } from "@/lib/media/image-variants";
import { useI18n } from "@/i18n/client";

function getCopy(locale: string) {
  const copies = {
    ru: { processing: "Изображение обрабатывается", failed: "Ошибка обработки", photo: "фото", showPhoto: "Показать фото" },
    kk: { processing: "Сурет өңделуде", failed: "Өңдеу қатесі", photo: "фото", showPhoto: "Фотосуретті көрсету" },
    en: { processing: "Image is processing", failed: "Processing failed", photo: "photos", showPhoto: "Show photo" },
    "zh-CN": { processing: "图片正在处理", failed: "处理失败", photo: "张照片", showPhoto: "显示照片" }
  } as const;
  return locale === "kk" || locale === "en" || locale === "zh-CN" ? copies[locale] : copies.ru;
}

export function VehicleGallery({ media, title, fallbackImageUrl }: { media: ListingMedia[]; title: string; fallbackImageUrl?: string | null }) {
  const { locale } = useI18n();
  const copy = getCopy(locale);
  const images = getGalleryImages(media, fallbackImageUrl);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex] ?? images[0];

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-oto bg-oto-surface md:aspect-[21/9]">
        <SafeImage src={activeImage?.largeUrl} media={activeImage?.media} variant="large" alt={title} fallbackClassName="text-lg" />
        {activeImage?.processing ? (
          <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-oto-muted shadow-soft">
            {copy.processing}
          </span>
        ) : null}
        {activeImage?.failed ? (
          <span className="absolute right-3 top-3 rounded-full bg-red-50 px-3 py-1 text-xs font-black text-oto-danger shadow-soft">
            {copy.failed}
          </span>
        ) : null}
        {images.length > 0 ? (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-3 py-1 text-xs font-black text-white">
            {activeIndex + 1}/{images.length} {copy.photo}
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
              aria-label={`${copy.showPhoto}: ${index + 1}`}
            >
              <SafeImage src={item.thumbUrl} media={item.media} variant="thumb" alt={title} />
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
      largeUrl: getBestImageUrl(item, "large"),
      thumbUrl: getBestImageUrl(item, "thumb"),
      media: item,
      processing: isImageProcessing(item),
      failed: isImageProcessingFailed(item)
    }))
    .filter((item) => item.largeUrl);

  if (images.length === 0 && fallbackImageUrl) {
    return [{ key: fallbackImageUrl, largeUrl: fallbackImageUrl, thumbUrl: fallbackImageUrl, media: undefined, processing: false, failed: false }];
  }

  return images;
}
