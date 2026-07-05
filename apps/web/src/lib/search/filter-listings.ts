import type { HomeListing } from "@/lib/supabase/types";
import { cityLabel } from "@/lib/format";
import type { ListingSearchFilters } from "./search-params";
import { selectedValues } from "./search-params";

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
  const makeValues = selectedValues(filters.make);
  const modelValues = selectedValues(filters.model);
  const cityValues = selectedValues(filters.city);
  const normalizedCityValues = cityValues.map((city) => normalize(cityLabel(city)));
  const fuelValues = selectedValues(filters.fuelType);
  const transmissionValues = selectedValues(filters.transmission);
  const bodyValues = selectedValues(filters.bodyType).map(normalize);
  const support = getAvailableFilterFields(listings);

  const filtered = listings.filter((listing) => {
    const future = listing as ListingWithOptionalFutureFields;
    const text = normalize([listing.title, listing.make_name, listing.model_name, listing.city].filter(Boolean).join(" "));
    const price = Number(listing.price_amount ?? 0);
    const year = Number(listing.year ?? 0);
    const mileage = Number(listing.mileage_km ?? 0);

    if (q && !text.includes(q)) return false;
    if (makeValues.length > 0 && !makeValues.includes(listing.make_name ?? "")) return false;
    if (modelValues.length > 0 && !modelValues.includes(listing.model_name ?? "")) return false;
    if (normalizedCityValues.length > 0 && !normalizedCityValues.includes(normalize(cityLabel(listing.city)))) return false;
    if (priceMin && price < priceMin) return false;
    if (priceMax && price > priceMax) return false;
    if (yearMin && year < yearMin) return false;
    if (yearMax && year > yearMax) return false;
    if (mileageMax && (!mileage || mileage > mileageMax)) return false;
    if (fuelValues.length > 0 && !fuelValues.includes(listing.fuel_type ?? "")) return false;
    if (transmissionValues.length > 0 && !transmissionValues.includes(listing.transmission ?? "")) return false;
    if (bodyValues.length > 0 && support.bodyType && !bodyValues.includes(normalize(future.body_type ?? ""))) return false;
    if (filters.condition && support.condition && future.condition !== filters.condition) return false;
    if (filters.sellerType && support.sellerType && future.seller_type !== filters.sellerType) return false;
    if (filters.driveType && support.driveType && future.drive_type !== filters.driveType) return false;
    if (filters.color && support.color && future.color !== filters.color) return false;
    if (filters.damageState && support.damageState && future.damage_state !== filters.damageState) return false;
    if (filters.ownerCount && support.ownerCount && Number(future.owner_count ?? 0) !== Number(filters.ownerCount)) return false;
    if (filters.engineVolume && support.engineVolume && Number(future.engine_volume_l ?? 0) !== Number(filters.engineVolume)) return false;
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

export function getListingCountByMake(listings: HomeListing[]) {
  return listings.reduce<Record<string, number>>((counts, listing) => {
    const make = listing.make_name?.trim();
    if (!make) return counts;
    counts[make] = (counts[make] ?? 0) + 1;
    return counts;
  }, {});
}

export function getAvailableFilterFields(listings: HomeListing[]) {
  const futureRows = listings as ListingWithOptionalFutureFields[];
  return {
    priceNegotiable: futureRows.some((listing) => typeof listing.price_negotiable === "boolean"),
    promoted: futureRows.some((listing) => listing.is_promoted === true || listing.is_hot === true),
    photos: listings.some((listing) => Boolean(listing.cover_image_url)),
    bodyType: hasField(futureRows, "body_type"),
    condition: hasField(futureRows, "condition"),
    sellerType: hasField(futureRows, "seller_type"),
    driveType: hasField(futureRows, "drive_type"),
    color: hasField(futureRows, "color"),
    engineVolume: hasField(futureRows, "engine_volume_l"),
    damageState: hasField(futureRows, "damage_state"),
    ownerCount: hasField(futureRows, "owner_count")
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

function hasField<T extends object>(rows: T[], key: keyof T) {
  return rows.some((row) => Object.prototype.hasOwnProperty.call(row, key));
}
