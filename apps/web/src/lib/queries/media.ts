import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { ListingMedia } from "@/lib/supabase/types";
import type { QueryResult } from "./listings";
import { signImageStorageUrlMap } from "@/lib/media/storage-urls";

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

async function signListingMedia(supabase: ReturnType<typeof getSupabaseServerClient>, rows: ListingMedia[]) {
  const fields = ["url", "original_url", "large_url", "card_url", "thumb_url"] as const;
  const signed = await signImageStorageUrlMap(supabase, rows.flatMap((row) => fields.map((field) => row[field])));
  return rows.map((row) => Object.fromEntries(
    Object.entries(row).map(([key, value]) => fields.includes(key as typeof fields[number]) && typeof value === "string"
      ? [key, signed.get(value) ?? null]
      : [key, value])
  ) as ListingMedia);
}

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
  const rows = await signListingMedia(supabase, (data ?? []) as unknown as ListingMedia[]);

  return {
    data: rows,
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
  const rows = await signListingMedia(supabase, (data ?? []) as unknown as ListingMedia[]);

  return {
    data: rows,
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
  const rows = await signListingMedia(supabase, (data ?? []) as unknown as ListingMedia[]);

  return {
    data: rows,
    error: error?.message ?? null,
    count: data?.length ?? 0,
    queryName
  };
}
