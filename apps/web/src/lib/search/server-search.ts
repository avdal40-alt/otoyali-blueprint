import type { City, HomeListing, Make, Model } from "@/lib/supabase/types";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { QueryResult } from "@/lib/queries/listings";
import { signImageStorageUrlMap } from "@/lib/media/storage-urls";
import type { ListingSearchFilters } from "./search-params";
import { buildSearchRequest } from "./search-request";
import { createPostgresSearchService, type PublicSearchItem as SearchListing, type SearchCursor } from "./search-service";

export type { SearchCursor } from "./search-service";
export { buildSearchRequest } from "./search-request";

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
  const { data: response, error } = await createPostgresSearchService(supabase).search(buildSearchRequest(filters, catalogs));
  const items = Array.isArray(response?.items) ? response.items : [];
  const signed = await signImageStorageUrlMap(supabase, items.map((item) => item.cover_image_url));

  return {
    data: items.map((item) => toHomeListing(item, signed.get(item.cover_image_url ?? "") ?? null)),
    error,
    count: items.length,
    queryName,
    nextCursor: response?.next_cursor ?? null
  };
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
    views_count: listing.views_count,
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
