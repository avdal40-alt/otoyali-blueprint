import "server-only";

import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export type PublicCanonicalGeneration = {
  generationId: string;
  generationName: string;
  modelName: string;
  makeName: string;
};

/** Reads only active, public canonical catalog rows for the explicit comparison action. */
export async function getPublicCanonicalGenerations(generationIds: readonly string[]): Promise<PublicCanonicalGeneration[]> {
  const ids = [...new Set(generationIds)].slice(0, 4);
  if (!ids.length || !hasSupabaseEnv()) return [];
  const { data } = await getSupabaseServerClient().schema("vehicle").from("generations")
    .select("id,name,models!inner(name,makes!inner(name))")
    .in("id", ids)
    .eq("is_active", true);
  return ((data ?? []) as unknown as Array<{ id: string; name: string; models: { name: string; makes: { name: string } } }>).map((row) => ({
    generationId: row.id,
    generationName: row.name,
    modelName: row.models.name,
    makeName: row.models.makes.name
  }));
}
