import type { HomeListing } from "@/lib/supabase/types";
import { EmptyState } from "@/components/ui/States";
import { VehicleCard } from "./VehicleCard";

export function VehicleGrid({
  listings,
  title = "Ilan bulunamadi",
  body = "Filtreleri degistirerek tekrar deneyin."
}: {
  listings: HomeListing[];
  title?: string;
  body?: string;
}) {
  if (listings.length === 0) {
    return <EmptyState title={title} body={body} href="/sell" action="Ilan yayinla" />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((listing) => (
        <VehicleCard key={listing.listing_id} listing={listing} />
      ))}
    </div>
  );
}
