import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { HomeListing, ListingDetails } from "@/lib/supabase/types";

export type QueryResult<T> = {
  data: T;
  error: string | null;
};

export async function getHomeListings(limit?: number): Promise<QueryResult<HomeListing[]>> {
  if (!hasSupabaseEnv()) {
    return { data: [], error: "Supabase environment variables are missing." };
  }

  const supabase = getSupabaseServerClient();
  let query = supabase.from("ff_home_listings").select("*").order("published_at", { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  return {
    data: (data ?? []) as HomeListing[],
    error: error?.message ?? null
  };
}

export async function getListingDetails(listingId: string): Promise<QueryResult<ListingDetails | null>> {
  if (!hasSupabaseEnv()) {
    return { data: null, error: "Supabase environment variables are missing." };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("ff_listing_details")
    .select("*")
    .eq("listing_id", listingId)
    .maybeSingle();

  return {
    data: (data as ListingDetails | null) ?? null,
    error: error?.message ?? null
  };
}
