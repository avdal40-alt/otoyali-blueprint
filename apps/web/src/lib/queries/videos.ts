import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { OtoyaliVideo } from "@/lib/supabase/types";
import type { QueryResult } from "./listings";
import { signImageStorageUrlMap, signStorageUrlMap } from "@/lib/media/storage-urls";

const VIDEO_FEED_COLUMNS = [
  "video_id",
  "listing_id",
  "title",
  "description",
  "video_url",
  "thumbnail_url",
  "poster_url",
  "duration_seconds",
  "likes_count",
  "views_count",
  "created_at",
  "sort_order",
  "listing_title",
  "price_amount",
  "currency",
  "city",
  "year",
  "mileage_km",
  "fuel_type",
  "seller_type",
  "seller_display_name",
  "cover_image_url"
].join(",");

export async function getVideoFeed({
  listingId,
  limit = 6
}: {
  listingId?: string | null;
  limit?: number;
} = {}): Promise<QueryResult<OtoyaliVideo[]>> {
  const queryName = "ff_akis_videos";
  if (!hasSupabaseEnv()) {
    return { data: [], error: "Supabase environment variables are missing.", count: 0, queryName };
  }

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("ff_akis_videos")
    .select(VIDEO_FEED_COLUMNS)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (listingId) {
    query = query.eq("listing_id", listingId);
  }

  const { data, error } = await query;

  if (isMissingVideoFeedView(error?.message)) {
    return { data: [], error: null, count: 0, queryName };
  }

  const rows = (data ?? []) as unknown as OtoyaliVideo[];
  const signedVideos = await signStorageUrlMap(supabase, "listing-videos", rows.flatMap((row) => [row.video_url, row.thumbnail_url, row.poster_url]));
  const signedCovers = await signImageStorageUrlMap(supabase, rows.map((row) => row.cover_image_url));

  return {
    data: rows.map((row) => ({
      ...row,
      video_url: signedVideos.get(row.video_url ?? "") ?? null,
      thumbnail_url: signedVideos.get(row.thumbnail_url ?? "") ?? null,
      poster_url: signedVideos.get(row.poster_url ?? "") ?? null,
      cover_image_url: signedCovers.get(row.cover_image_url ?? "") ?? null
    })),
    error: error?.message ?? null,
    count: data?.length ?? 0,
    queryName
  };
}

export async function getListingVideos(listingId: string, limit = 3): Promise<QueryResult<OtoyaliVideo[]>> {
  return getVideoFeed({ listingId, limit });
}

function isMissingVideoFeedView(message?: string | null) {
  if (!message) return false;
  return message.includes("ff_akis_videos") && (message.includes("does not exist") || message.includes("Could not find"));
}
