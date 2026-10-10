import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export type VehicleReview = { id: string; model_id: string; generation_id: string; modification_id: string | null; rating: number; pros: string[]; cons: string[]; body: string | null; ownership_status: "current_owner" | "former_owner"; created_at: string };

export async function getVehicleReviews(modelId?: string) {
  if (!hasSupabaseEnv()) return { data: [] as VehicleReview[], error: "Supabase environment variables are missing." };
  let query = getSupabaseServerClient().schema("vehicle").from("owner_reviews").select("id,model_id,generation_id,modification_id,rating,pros,cons,body,ownership_status,created_at").eq("moderation_status", "approved").order("created_at", { ascending: false });
  if (modelId) query = query.eq("model_id", modelId);
  const { data, error } = await query;
  return { data: (data ?? []) as VehicleReview[], error: error?.message ?? null };
}
