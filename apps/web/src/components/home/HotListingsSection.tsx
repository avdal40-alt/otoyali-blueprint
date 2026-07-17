import type { HomeListing, ListingMedia } from "@/lib/supabase/types";
import { getPriceBadgeForListing } from "@/lib/market-price/analysis";
import { VehicleCard } from "@/components/vehicle/VehicleCard";
import { EmptyState } from "@/components/ui/States";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/types";

export function HotListingsSection({
  listings,
  mediaByListing = {},
  locale = "tr"
}: {
  listings: HomeListing[];
  mediaByListing?: Record<string, ListingMedia[]>;
  locale?: Locale;
}) {
  const dictionary = getDictionary(locale);
  const hotListings = listings.slice(0, 4);

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-oto-orange">{String(dictionary.home.hotEyebrow)}</p>
          <h2 className="text-xl font-bold text-oto-text md:text-2xl">{String(dictionary.home.hotTitle)}</h2>
          <p className="mt-1 max-w-2xl text-sm text-oto-muted">{String(dictionary.home.hotSubtitle)}</p>
        </div>
      </div>
      {hotListings.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {hotListings.map((listing) => (
            <VehicleCard key={listing.listing_id} listing={listing} media={mediaByListing[listing.listing_id]} compact promoted priceBadge={getPriceBadgeForListing(listing, listings)} locale={locale} />
          ))}
        </div>
      ) : (
        <EmptyState title={String(dictionary.home.hotEmptyTitle)} body={String(dictionary.home.hotEmptyBody)} />
      )}
    </section>
  );
}
