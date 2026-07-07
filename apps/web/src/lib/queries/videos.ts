import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { OtoyaliVideo } from "@/lib/supabase/types";
import type { QueryResult } from "./listings";

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
    .select("*", { count: "exact" })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (listingId) {
    query = query.eq("listing_id", listingId);
  }

  const { data, error, count } = await query;

  if (isMissingVideoFeedView(error?.message)) {
    return { data: [], error: null, count: 0, queryName };
  }

  return {
    data: (data ?? []) as OtoyaliVideo[],
    error: error?.message ?? null,
    count: count ?? data?.length ?? 0,
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
