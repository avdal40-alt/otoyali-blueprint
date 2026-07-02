import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { HomeListing, ListingDetails } from "@/lib/supabase/types";

export type QueryResult<T> = {
  data: T;
  error: string | null;
  count: number;
  queryName: string;
};

export async function getHomeListings(limit?: number): Promise<QueryResult<HomeListing[]>> {
  const queryName = "ff_home_listings";
  if (!hasSupabaseEnv()) {
    return { data: [], error: "Supabase environment variables are missing.", count: 0, queryName };
  }

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("ff_home_listings")
    .select("*", { count: "exact" })
    .order("published_at", { ascending: false, nullsFirst: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error, count } = await query;

  return {
    data: (data ?? []) as HomeListing[],
    error: error?.message ?? null,
    count: count ?? data?.length ?? 0,
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
    .select("*")
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
    .select("*")
    .eq("listing_id", listingId)
    .maybeSingle();

  return {
    data: (data as HomeListing | null) ?? null,
    error: error?.message ?? null,
    count: data ? 1 : 0,
    queryName
  };
}
