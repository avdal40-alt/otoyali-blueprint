import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { Make, Model } from "@/lib/supabase/types";
import type { QueryResult } from "./listings";

export async function getMakes(): Promise<QueryResult<Make[]>> {
  const queryName = "ff_makes";
  if (!hasSupabaseEnv()) {
    return { data: [], error: "Supabase environment variables are missing.", count: 0, queryName };
  }

  const supabase = getSupabaseServerClient();
  const { data, error, count } = await supabase
    .from("ff_makes")
    .select("*", { count: "exact" })
    .order("make_name", { ascending: true });

  return {
    data: (data ?? []) as Make[],
    error: error?.message ?? null,
    count: count ?? data?.length ?? 0,
    queryName
  };
}

export async function getModels(): Promise<QueryResult<Model[]>> {
  const queryName = "ff_models";
  if (!hasSupabaseEnv()) {
    return { data: [], error: "Supabase environment variables are missing.", count: 0, queryName };
  }

  const supabase = getSupabaseServerClient();
  const { data, error, count } = await supabase
    .from("ff_models")
    .select("*", { count: "exact" })
    .order("make_name", { ascending: true })
    .order("model_name", { ascending: true });

  return {
    data: (data ?? []) as Model[],
    error: error?.message ?? null,
    count: count ?? data?.length ?? 0,
    queryName
  };
}
