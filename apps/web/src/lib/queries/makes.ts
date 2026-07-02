import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { Make, Model } from "@/lib/supabase/types";
import type { QueryResult } from "./listings";

export async function getMakes(): Promise<QueryResult<Make[]>> {
  if (!hasSupabaseEnv()) {
    return { data: [], error: "Supabase environment variables are missing." };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("ff_makes").select("*").order("make_name", { ascending: true });

  return {
    data: (data ?? []) as Make[],
    error: error?.message ?? null
  };
}

export async function getModels(): Promise<QueryResult<Model[]>> {
  if (!hasSupabaseEnv()) {
    return { data: [], error: "Supabase environment variables are missing." };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("ff_models")
    .select("*")
    .order("make_name", { ascending: true })
    .order("model_name", { ascending: true });

  return {
    data: (data ?? []) as Model[],
    error: error?.message ?? null
  };
}
