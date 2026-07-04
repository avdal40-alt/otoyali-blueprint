import type { HomeListing } from "@/lib/supabase/types";
import { getPriceBadgeForListing } from "@/lib/market-price/analysis";
import { EmptyState } from "@/components/ui/States";
import { VehicleCard } from "./VehicleCard";

export function VehicleGrid({
  listings,
  title = "İlan bulunamadı",
  body = "Filtreleri değiştirerek tekrar deneyin."
}: {
  listings: HomeListing[];
  title?: string;
  body?: string;
}) {
  if (listings.length === 0) {
    return <EmptyState title={title} body={body} href="/sell" action="İlan yayınla" />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <VehicleCard key={listing.listing_id} listing={listing} priceBadge={getPriceBadgeForListing(listing, listings)} />
      ))}
    </div>
  );
}
