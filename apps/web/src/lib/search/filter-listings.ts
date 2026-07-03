import type { HomeListing } from "@/lib/supabase/types";
import type { ListingSearchFilters } from "./search-params";

type ListingWithOptionalFutureFields = HomeListing & {
  price_negotiable?: boolean | null;
  is_promoted?: boolean | null;
  is_hot?: boolean | null;
};

export function filterListings(listings: HomeListing[], filters: ListingSearchFilters) {
  const q = normalize(filters.q);
  const priceMin = toNumber(filters.priceMin);
  const priceMax = toNumber(filters.priceMax);
  const yearMin = toNumber(filters.yearMin);
  const yearMax = toNumber(filters.yearMax);
  const mileageMax = toNumber(filters.mileageMax);
  const support = getAvailableFilterFields(listings);

  const filtered = listings.filter((listing) => {
    const future = listing as ListingWithOptionalFutureFields;
    const text = normalize([listing.title, listing.make_name, listing.model_name, listing.city].filter(Boolean).join(" "));
    const price = Number(listing.price_amount ?? 0);
    const year = Number(listing.year ?? 0);
    const mileage = Number(listing.mileage_km ?? 0);

    if (q && !text.includes(q)) return false;
    if (filters.make && listing.make_name !== filters.make) return false;
    if (filters.model && listing.model_name !== filters.model) return false;
    if (filters.city && listing.city !== filters.city) return false;
    if (priceMin && price < priceMin) return false;
    if (priceMax && price > priceMax) return false;
    if (yearMin && year < yearMin) return false;
    if (yearMax && year > yearMax) return false;
    if (mileageMax && (!mileage || mileage > mileageMax)) return false;
    if (filters.fuelType && listing.fuel_type !== filters.fuelType) return false;
    if (filters.transmission && listing.transmission !== filters.transmission) return false;
    if (filters.onlyWithPhotos && !listing.cover_image_url) return false;
    if (filters.negotiableOnly && support.priceNegotiable && future.price_negotiable !== true) return false;
    if (filters.promotedOnly && support.promoted && future.is_promoted !== true && future.is_hot !== true) return false;

    return true;
  });

  return sortListings(filtered, filters.sort);
}

export function sortListings(listings: HomeListing[], sort: ListingSearchFilters["sort"]) {
  return [...listings].sort((a, b) => {
    if (sort === "price_asc") return Number(a.price_amount ?? 0) - Number(b.price_amount ?? 0);
    if (sort === "price_desc") return Number(b.price_amount ?? 0) - Number(a.price_amount ?? 0);
    if (sort === "year_desc") return Number(b.year ?? 0) - Number(a.year ?? 0);
    if (sort === "mileage_asc") return Number(a.mileage_km ?? Number.MAX_SAFE_INTEGER) - Number(b.mileage_km ?? Number.MAX_SAFE_INTEGER);
    return new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime();
  });
}

export function getUniqueCities(listings: HomeListing[]) {
  return unique(listings.map((listing) => listing.city));
}

export function getAvailableFilterFields(listings: HomeListing[]) {
  const futureRows = listings as ListingWithOptionalFutureFields[];
  return {
    priceNegotiable: futureRows.some((listing) => typeof listing.price_negotiable === "boolean"),
    promoted: futureRows.some((listing) => listing.is_promoted === true || listing.is_hot === true),
    photos: listings.some((listing) => Boolean(listing.cover_image_url))
  };
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "tr"));
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function toNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}
