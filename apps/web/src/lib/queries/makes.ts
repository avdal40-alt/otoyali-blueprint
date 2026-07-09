import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { Make, Model } from "@/lib/supabase/types";
import type { QueryResult } from "./listings";

export async function getMakes(): Promise<QueryResult<Make[]>> {
  const queryName = "ff_makes";
  if (!hasSupabaseEnv()) {
    return { data: [], error: "Supabase environment variables are missing.", count: 0, queryName };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("ff_makes")
    .select("make_id,make_name,make_slug")
    .order("make_name", { ascending: true });

  return {
    data: (data ?? []) as Make[],
    error: error?.message ?? null,
    count: data?.length ?? 0,
    queryName
  };
}

export async function getModels(): Promise<QueryResult<Model[]>> {
  const queryName = "ff_models";
  if (!hasSupabaseEnv()) {
    return { data: [], error: "Supabase environment variables are missing.", count: 0, queryName };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("ff_models")
    .select("model_id,make_id,make_name,model_name,model_slug")
    .order("make_name", { ascending: true })
    .order("model_name", { ascending: true });

  return {
    data: (data ?? []) as Model[],
    error: error?.message ?? null,
    count: data?.length ?? 0,
    queryName
  };
}
