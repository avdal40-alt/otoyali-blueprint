import Link from "next/link";
import type { HomeListing } from "@/lib/supabase/types";
import { formatMileage, formatPrice, fuelLabel, transmissionLabel } from "@/lib/format";
import { SpecChip } from "./SpecChip";
import { FavoriteButton } from "./FavoriteButton";

export function VehicleCard({ listing, compact = false }: { listing: HomeListing; compact?: boolean }) {
  return (
    <article className="group overflow-hidden rounded-oto border border-oto-border bg-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-oto">
      <Link href={`/listing/${listing.listing_id}`} className="block">
        <div className={compact ? "aspect-[4/3] bg-oto-surface" : "aspect-[16/10] bg-oto-surface"}>
          {listing.cover_image_url ? (
            <img src={listing.cover_image_url} alt={listing.title} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-bold text-oto-muted">OTOYALI</div>
          )}
        </div>
      </Link>
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <Link href={`/listing/${listing.listing_id}`} className="min-w-0">
            <h3 className="line-clamp-2 text-base font-bold leading-snug text-oto-text">{listing.title}</h3>
          </Link>
          <FavoriteButton listingId={listing.listing_id} />
        </div>
        <p className="mt-2 text-xl font-black text-oto-text">{formatPrice(listing.price_amount, listing.currency)}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <SpecChip>{listing.year}</SpecChip>
          <SpecChip>{formatMileage(listing.mileage_km)}</SpecChip>
          <SpecChip>{transmissionLabel(listing.transmission)}</SpecChip>
          <SpecChip>{fuelLabel(listing.fuel_type)}</SpecChip>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm font-semibold text-oto-muted">
          <span>{listing.city}</span>
          <span>
            {listing.make_name} {listing.model_name}
          </span>
        </div>
      </div>
    </article>
  );
}
