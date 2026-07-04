import type { HomeListing } from "@/lib/supabase/types";
import { getPriceBadgeForListing } from "@/lib/market-price/analysis";
import { VehicleCard } from "@/components/vehicle/VehicleCard";
import { EmptyState } from "@/components/ui/States";

export function HotListingsSection({ listings }: { listings: HomeListing[] }) {
  const hotListings = listings.slice(0, 4);

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-oto-orange">Vitrin</p>
          <h2 className="text-xl font-bold text-oto-text md:text-2xl">Öne çıkan ilanlar</h2>
          <p className="mt-1 max-w-2xl text-sm text-oto-muted">Dikkat çeken araçları hızlıca keşfedin ve favori ilanlarınızı kaçırmayın.</p>
        </div>
      </div>
      {hotListings.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {hotListings.map((listing) => (
            <VehicleCard key={listing.listing_id} listing={listing} compact promoted priceBadge={getPriceBadgeForListing(listing, listings)} />
          ))}
        </div>
      ) : (
        <EmptyState title="Öne çıkan ilan yok" body="Aktif ilanlar geldiğinde bu alan otomatik dolacak." />
      )}
    </section>
  );
}
