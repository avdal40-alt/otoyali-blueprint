import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { City } from "@/lib/supabase/types";
import type { QueryResult } from "./listings";

export async function getCities(): Promise<QueryResult<City[]>> {
  const queryName = "ff_cities";
  if (!hasSupabaseEnv()) {
    return { data: [], error: "Supabase environment variables are missing.", count: 0, queryName };
  }

  const supabase = getSupabaseServerClient();
  const { data, error, count } = await supabase
    .from("ff_cities")
    .select("*", { count: "exact" })
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("city_name", { ascending: true });

  return {
    data: (data ?? []) as City[],
    error: error?.message ?? null,
    count: count ?? data?.length ?? 0,
    queryName
  };
}
