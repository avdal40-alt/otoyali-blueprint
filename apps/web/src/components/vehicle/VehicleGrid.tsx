import type { HomeListing, ListingMedia } from "@/lib/supabase/types";
import { getJolmodGlobalDictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/types";
import { VehicleCard } from "./VehicleCard";
import { MarketplaceListingEmptyState } from "./MarketplaceListingEmptyState";

export function VehicleGrid({
  listings,
  listingMedia = [],
  title,
  body,
  locale = "ru",
  variant = "default"
}: {
  listings: HomeListing[];
  listingMedia?: ListingMedia[];
  title?: string;
  body?: string;
  locale?: Locale;
  variant?: "default" | "home";
}) {
  const mediaByListing = groupMediaByListing(listingMedia);
  const dictionary = getJolmodGlobalDictionary(locale);

  if (listings.length === 0) {
    return (
      <MarketplaceListingEmptyState
        title={title ?? String(dictionary.search.noResultsTitle)}
        body={body ?? String(dictionary.search.noResultsBody)}
        locale={locale}
      />
    );
  }

  return (
    <div className={variant === "home" ? "grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-4" : "grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"}>
      {listings.map((listing) => (
        <VehicleCard key={listing.listing_id} listing={listing} media={mediaByListing[listing.listing_id]} locale={locale} />
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
