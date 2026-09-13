import type { City, HomeListing, Make, Model } from "@/lib/supabase/types";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { QueryResult } from "@/lib/queries/listings";
import { signImageStorageUrlMap } from "@/lib/media/storage-urls";
import { selectedValues, type ListingSearchFilters } from "./search-params";

export type SearchCursor = {
  version: "v1";
  sort: ListingSearchFilters["sort"];
  listing_id: string;
  published_at?: string;
  price_amount?: number;
  year?: number;
  mileage_km?: number;
};

type SearchResponse = {
  version: "v1";
  items: SearchListing[];
  next_cursor: SearchCursor | null;
};

type SearchListing = {
  listing_id: string;
  make_name: string | null;
  model_name: string | null;
  city_name: string | null;
  cover_image_url: string | null;
  photo_count: number;
  has_video: boolean;
  published_at: string | null;
  price_amount: number | null;
  currency: string | null;
  year: number | null;
  mileage_km: number | null;
  fuel_type: string | null;
  transmission: string | null;
  body_type: string | null;
  condition: string | null;
  seller_type: string | null;
  drive_type: string | null;
  color: string | null;
  engine_volume_l: number | null;
  price_negotiable: boolean | null;
};

export type SearchListingsResult = QueryResult<HomeListing[]> & {
  nextCursor: SearchCursor | null;
};

export async function searchListings(
  filters: ListingSearchFilters,
  catalogs: { makes: Make[]; models: Model[]; cities: City[] }
): Promise<SearchListingsResult> {
  const queryName = "marketplace.search_listings_v1";
  if (!hasSupabaseEnv()) {
    return { data: [], error: "Supabase environment variables are missing.", count: 0, queryName, nextCursor: null };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.schema("marketplace").rpc("search_listings_v1", {
    p_request: buildSearchRequest(filters, catalogs)
  });
  const response = data as SearchResponse | null;
  const items = Array.isArray(response?.items) ? response.items : [];
  const signed = await signImageStorageUrlMap(supabase, items.map((item) => item.cover_image_url));

  return {
    data: items.map((item) => toHomeListing(item, signed.get(item.cover_image_url ?? "") ?? null)),
    error: error?.message ?? null,
    count: items.length,
    queryName,
    nextCursor: response?.next_cursor ?? null
  };
}

export function buildSearchRequest(
  filters: ListingSearchFilters,
  { makes, models, cities }: { makes: Make[]; models: Model[]; cities: City[] }
) {
  const matchIds = (
    values: string,
    rows: object[],
    nameKey: string,
    idKey: string
  ) => {
    const wanted = new Set(selectedValues(values));
    return rows.flatMap((row) => {
      const item = row as Record<string, unknown>;
      return wanted.has(String(item[nameKey] ?? "")) && item[idKey] ? [String(item[idKey])] : [];
    });
  };
  const integer = (value: string, max = Number.MAX_SAFE_INTEGER) => {
    if (!/^\d+$/.test(value)) return undefined;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed <= max ? parsed : undefined;
  };
  const decimal = (value: string, max: number) => {
    if (!/^\d+(?:\.\d)?$/.test(value)) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed <= max ? parsed : undefined;
  };
  const filtersRequest = compact({
    q: filters.q.trim() || undefined,
    make_ids: matchIds(filters.make, makes, "make_name", "make_id"),
    model_ids: matchIds(filters.model, models, "model_name", "model_id"),
    city_ids: matchIds(filters.city, cities, "city_name", "city_id"),
    price_min: integer(filters.priceMin),
    price_max: integer(filters.priceMax),
    year_min: integer(filters.yearMin, 32767),
    year_max: integer(filters.yearMax, 32767),
    mileage_max: integer(filters.mileageMax, 2147483647),
    fuel_types: selectedValues(filters.fuelType),
    transmissions: selectedValues(filters.transmission),
    body_types: selectedValues(filters.bodyType),
    drive_types: filters.driveType ? [filters.driveType] : [],
    colors: filters.color ? [filters.color] : [],
    condition: filters.condition || undefined,
    seller_types: filters.sellerType ? [filters.sellerType] : [],
    engine_volume_min: decimal(filters.engineVolume, 999.9),
    engine_volume_max: decimal(filters.engineVolume, 999.9),
    price_negotiable: filters.negotiableOnly || undefined,
    trade_in_accepted: filters.tradeOnly || undefined,
    has_photos: filters.onlyWithPhotos || undefined
  });

  return compact({
    version: "v1" as const,
    limit: 24,
    sort: filters.sort,
    cursor: filters.cursor,
    filters: filtersRequest
  });
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && (!Array.isArray(item) || item.length > 0))
  );
}

function toHomeListing(listing: SearchListing, coverImageUrl: string | null): HomeListing {
  const title = [listing.make_name, listing.model_name].filter(Boolean).join(" ") || null;
  return {
    listing_id: listing.listing_id,
    title,
    price_amount: listing.price_amount,
    currency: listing.currency,
    price_negotiable: listing.price_negotiable,
    city: listing.city_name,
    published_at: listing.published_at,
    make_name: listing.make_name,
    model_name: listing.model_name,
    year: listing.year,
    mileage_km: listing.mileage_km,
    fuel_type: listing.fuel_type,
    transmission: listing.transmission,
    cover_image_url: coverImageUrl,
    media_count: listing.photo_count,
    body_type: listing.body_type,
    condition: listing.condition,
    seller_type: listing.seller_type,
    drive_type: listing.drive_type,
    color: listing.color,
    engine_volume_l: listing.engine_volume_l,
    video_count: listing.has_video ? 1 : 0
  };
}
