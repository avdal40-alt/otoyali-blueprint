"use client";

import { MouseEvent, useState } from "react";
import Link from "next/link";
import type { HomeListing, ListingMedia } from "@/lib/supabase/types";
import { cn } from "@/lib/cn";
import { cityLabel, conditionLabel, formatDate, formatMileage, formatNumber, formatPrice, fuelLabel, sellerTypeLabel, transmissionLabel } from "@/lib/format";
import { getBestImageUrl, type ImageSource } from "@/lib/media/image-variants";
import { SafeImage } from "@/components/ui/SafeImage";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/types";
import { SpecChip } from "./SpecChip";
import { FavoriteButton } from "./FavoriteButton";

export function VehicleCard({
  listing,
  media = [],
  promoted = false,
  locale
}: {
  listing: HomeListing;
  media?: ListingMedia[];
  compact?: boolean;
  promoted?: boolean;
  locale?: Locale;
}) {
  const { locale: contextLocale, dictionary } = useI18n();
  const activeLocale = locale ?? contextLocale;
  const [previewIndex, setPreviewIndex] = useState(0);
  const title = listing.title?.trim() || String(dictionary.common.noInfo);
  const city = cityLabel(listing.city, activeLocale);
  const makeModel = [listing.make_name, listing.model_name].filter(Boolean).join(" ") || String(dictionary.common.noInfo);
  const images = getPreviewImages(listing, media);
  const imageCount = images.length;
  const currentImage = images[previewIndex] ?? images[0];

  function shiftImage(event: MouseEvent<HTMLButtonElement>, direction: -1 | 1) {
    event.preventDefault();
    event.stopPropagation();
    setPreviewIndex((current) => (current + direction + imageCount) % imageCount);
  }

  return (
    <article
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-oto border bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-oto",
        promoted ? "border-amber-200 ring-1 ring-amber-100" : "border-oto-border"
      )}
    >
      <div className="relative aspect-[4/3] bg-oto-surface">
        <Link href={localizePath(`/listing/${listing.listing_id}`, activeLocale)} className="block h-full">
          <SafeImage src={currentImage?.url} media={currentImage?.media} variant="card" alt={title} className="transition duration-300 group-hover:scale-[1.02]" />
        </Link>

        <div className="absolute right-3 top-3 z-20">
          <FavoriteButton listingId={listing.listing_id} />
        </div>

        <div className="absolute left-3 top-3 z-10 flex flex-wrap gap-2">
          {promoted ? (
            <span className="rounded-full bg-oto-orange px-3 py-1 text-xs font-black text-white shadow-soft">
              {String(dictionary.status.featured)}
            </span>
          ) : null}
          {listing.condition ? (
            <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-black text-oto-text shadow-soft backdrop-blur">
              {conditionLabel(listing.condition, activeLocale)}
            </span>
          ) : null}
          {(listing.video_count ?? 0) > 0 ? (
            <Link
              href={localizePath(`/video?listing=${listing.listing_id}`, activeLocale)}
              className="rounded-full bg-oto-blue px-3 py-1 text-xs font-black text-white shadow-soft"
            >
              Video
            </Link>
          ) : null}
        </div>

        {imageCount > 1 ? (
          <>
            <button
              type="button"
              aria-label={String(dictionary.listing.previousPhoto)}
              onClick={(event) => shiftImage(event, -1)}
              className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-black text-oto-text shadow-soft transition hover:bg-white md:hidden md:group-hover:flex"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label={String(dictionary.listing.nextPhoto)}
              onClick={(event) => shiftImage(event, 1)}
              className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-black text-oto-text shadow-soft transition hover:bg-white md:hidden md:group-hover:flex"
            >
              ›
            </button>
            <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-black text-white">
              <span>{previewIndex + 1}/{imageCount}</span>
              <div className="flex gap-1">
                {images.slice(0, 5).map((image, index) => (
                  <span key={`${image}-${index}`} className={cn("h-1.5 w-1.5 rounded-full", index === previewIndex ? "bg-white" : "bg-white/40")} />
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-3">
        <Link href={localizePath(`/listing/${listing.listing_id}`, activeLocale)} className="min-w-0">
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-oto-text">{title}</h3>
        </Link>
        <p className="mt-2 text-xl font-black text-oto-text">{formatPrice(listing.price_amount, listing.currency, activeLocale)}</p>

        <div className="mt-2 flex flex-wrap gap-2">
          {listing.seller_type ? (
            <span className="rounded-full border border-oto-border bg-oto-surface px-2.5 py-1 text-[11px] font-black text-oto-muted">
              {sellerTypeLabel(listing.seller_type, activeLocale)}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <SpecChip>{listing.year ?? String(dictionary.common.noInfo)}</SpecChip>
          <SpecChip>{formatMileage(listing.mileage_km, activeLocale)}</SpecChip>
          <SpecChip>{transmissionLabel(listing.transmission, activeLocale)}</SpecChip>
          <SpecChip>{fuelLabel(listing.fuel_type, activeLocale)}</SpecChip>
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 pt-3 text-sm font-semibold text-oto-muted">
          <span className="truncate">{city}</span>
          <span className="truncate text-right">{makeModel}</span>
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-oto-muted">
          <span>{String(dictionary.listing.publishedAt)}: {formatDate(listing.published_at, activeLocale)}</span>
          <span>{String(dictionary.listing.views)}: {formatNumber(listing.views_count ?? 0, activeLocale)}</span>
        </div>
      </div>
    </article>
  );
}

function getPreviewImages(listing: HomeListing, media: ListingMedia[]) {
  const images: Array<{ url: string; media?: ImageSource }> = media
    .map((item) => {
      const url = getBestImageUrl(item, "card");
      return url ? { url, media: item as ImageSource } : null;
    })
    .filter((item): item is { url: string; media: ImageSource } => Boolean(item));

  if (listing.cover_image_url) {
    images.unshift({ url: listing.cover_image_url, media: undefined });
  }

  return Array.from(new Map(images.map((image) => [image.url, image])).values());
}
