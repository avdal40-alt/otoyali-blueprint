import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { ListingMedia } from "@/lib/supabase/types";
import type { QueryResult } from "./listings";

export async function getListingMedia(listingId: string): Promise<QueryResult<ListingMedia[]>> {
  if (!hasSupabaseEnv()) {
    return { data: [], error: "Supabase environment variables are missing." };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("ff_listing_media")
    .select("*")
    .eq("listing_id", listingId)
    .order("is_cover", { ascending: false })
    .order("sort_order", { ascending: true });

  return {
    data: (data ?? []) as ListingMedia[],
    error: error?.message ?? null
  };
}
