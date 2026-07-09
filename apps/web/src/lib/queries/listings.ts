import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { HomeListing, ListingDetails } from "@/lib/supabase/types";

export type QueryResult<T> = {
  data: T;
  error: string | null;
  count: number;
  queryName: string;
};

const HOME_LISTING_COLUMNS = [
  "listing_id",
  "vehicle_profile_id",
  "title",
  "price_amount",
  "currency",
  "city",
  "published_at",
  "make_name",
  "model_name",
  "year",
  "mileage_km",
  "fuel_type",
  "transmission",
  "cover_image_url",
  "media_count",
  "price_negotiable",
  "body_type",
  "condition",
  "seller_type",
  "drive_type",
  "color",
  "engine_volume_l",
  "damage_state",
  "owner_count",
  "quality_score",
  "seller_display_name",
  "video_count"
].join(",");

const LISTING_DETAILS_COLUMNS = [
  "listing_id",
  "vehicle_profile_id",
  "seller_id",
  "title",
  "description",
  "price_amount",
  "currency",
  "price_negotiable",
  "city",
  "published_at",
  "make_name",
  "model_name",
  "year",
  "mileage_km",
  "fuel_type",
  "transmission",
  "cover_image_url",
  "media_count",
  "body_type",
  "condition",
  "seller_type",
  "drive_type",
  "color",
  "engine_volume_l",
  "damage_state",
  "owner_count",
  "quality_score",
  "seller_display_name",
  "video_count"
].join(",");

export async function getHomeListings(limit?: number): Promise<QueryResult<HomeListing[]>> {
  const queryName = "ff_home_listings";
  if (!hasSupabaseEnv()) {
    return { data: [], error: "Supabase environment variables are missing.", count: 0, queryName };
  }

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("ff_home_listings")
    .select(HOME_LISTING_COLUMNS)
    .order("published_at", { ascending: false, nullsFirst: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  return {
    data: (data ?? []) as unknown as HomeListing[],
    error: error?.message ?? null,
    count: data?.length ?? 0,
    queryName
  };
}

export async function getListingDetails(listingId: string): Promise<QueryResult<ListingDetails | null>> {
  const queryName = "ff_listing_details";
  if (!hasSupabaseEnv()) {
    return { data: null, error: "Supabase environment variables are missing.", count: 0, queryName };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("ff_listing_details")
    .select(LISTING_DETAILS_COLUMNS)
    .eq("listing_id", listingId)
    .maybeSingle();

  return {
    data: (data as ListingDetails | null) ?? null,
    error: error?.message ?? null,
    count: data ? 1 : 0,
    queryName
  };
}

export async function getHomeListingById(listingId: string): Promise<QueryResult<HomeListing | null>> {
  const queryName = "ff_home_listings_by_id";
  if (!hasSupabaseEnv()) {
    return { data: null, error: "Supabase environment variables are missing.", count: 0, queryName };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("ff_home_listings")
    .select(HOME_LISTING_COLUMNS)
    .eq("listing_id", listingId)
    .maybeSingle();

  return {
    data: (data as HomeListing | null) ?? null,
    error: error?.message ?? null,
    count: data ? 1 : 0,
    queryName
  };
}
