import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { ListingMedia } from "@/lib/supabase/types";
import type { QueryResult } from "./listings";

const LISTING_MEDIA_COLUMNS = [
  "listing_id",
  "vehicle_profile_id",
  "media_id",
  "url",
  "storage_path",
  "sort_order",
  "is_cover",
  "original_url",
  "large_url",
  "card_url",
  "thumb_url",
  "processed_status",
  "blur_status",
  "width",
  "height",
  "aspect_ratio",
  "mime_type",
  "size_bytes"
].join(",");

export async function getListingMedia(listingId: string): Promise<QueryResult<ListingMedia[]>> {
  const queryName = "ff_listing_media";
  if (!hasSupabaseEnv()) {
    return { data: [], error: "Supabase environment variables are missing.", count: 0, queryName };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("ff_listing_media")
    .select(LISTING_MEDIA_COLUMNS)
    .eq("listing_id", listingId)
    .order("is_cover", { ascending: false })
    .order("sort_order", { ascending: true });

  return {
    data: (data ?? []) as unknown as ListingMedia[],
    error: error?.message ?? null,
    count: data?.length ?? 0,
    queryName
  };
}

export async function getListingMediaByVehicleProfileId(vehicleProfileId: string): Promise<QueryResult<ListingMedia[]>> {
  const queryName = "ff_listing_media_by_vehicle_profile_id";
  if (!hasSupabaseEnv()) {
    return { data: [], error: "Supabase environment variables are missing.", count: 0, queryName };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("ff_listing_media")
    .select(LISTING_MEDIA_COLUMNS)
    .eq("vehicle_profile_id", vehicleProfileId)
    .order("is_cover", { ascending: false })
    .order("sort_order", { ascending: true });

  return {
    data: (data ?? []) as unknown as ListingMedia[],
    error: error?.message ?? null,
    count: data?.length ?? 0,
    queryName
  };
}

export async function getListingMediaForListings(listingIds: string[]): Promise<QueryResult<ListingMedia[]>> {
  const queryName = "ff_listing_media_for_listings";
  const uniqueIds = Array.from(new Set(listingIds.filter(Boolean)));

  if (!hasSupabaseEnv()) {
    return { data: [], error: "Supabase environment variables are missing.", count: 0, queryName };
  }

  if (uniqueIds.length === 0) {
    return { data: [], error: null, count: 0, queryName };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("ff_listing_media")
    .select(LISTING_MEDIA_COLUMNS)
    .in("listing_id", uniqueIds)
    .order("listing_id", { ascending: true })
    .order("is_cover", { ascending: false })
    .order("sort_order", { ascending: true });

  return {
    data: (data ?? []) as unknown as ListingMedia[],
    error: error?.message ?? null,
    count: data?.length ?? 0,
    queryName
  };
}
