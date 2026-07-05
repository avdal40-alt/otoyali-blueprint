import type { HomeListing, ListingMedia } from "@/lib/supabase/types";
import { getPriceBadgeForListing } from "@/lib/market-price/analysis";
import { EmptyState } from "@/components/ui/States";
import { VehicleCard } from "./VehicleCard";

export function VehicleGrid({
  listings,
  listingMedia = [],
  title = "İlan bulunamadı",
  body = "Filtreleri değiştirerek tekrar deneyin."
}: {
  listings: HomeListing[];
  listingMedia?: ListingMedia[];
  title?: string;
  body?: string;
}) {
  const mediaByListing = groupMediaByListing(listingMedia);

  if (listings.length === 0) {
    return <EmptyState title={title} body={body} href="/sell" action="İlan yayınla" />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <VehicleCard key={listing.listing_id} listing={listing} media={mediaByListing[listing.listing_id]} priceBadge={getPriceBadgeForListing(listing, listings)} />
      ))}
    </div>
  );
}

function groupMediaByListing(media: ListingMedia[]) {
  return media.reduce<Record<string, ListingMedia[]>>((groups, item) => {
    if (!item.listing_id) return groups;
    groups[item.listing_id] = [...(groups[item.listing_id] ?? []), item];
    return groups;
  }, {});
}
