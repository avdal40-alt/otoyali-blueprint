import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

const PAGE_SIZE = 20;

export type VehicleReview = { id: string; make_id: string; model_id: string; generation_id: string; modification_id: string | null; rating: number; pros: string[]; cons: string[]; body: string | null; ownership_status: "current_owner" | "former_owner"; created_at: string };
export type ReviewIdentity = { makeId: string; makeName: string; makeSlug: string; modelId: string; modelName: string; modelSlug: string; generationId: string; generationName: string; generationSlug: string };
export type ReviewListing = { listing_id: string; title: string | null; price_amount: number | null; currency: string | null; city: string | null; published_at: string | null };
export type ApprovedReviewSummary = { generationId: string; count: number; averageRating: number | null };

function unavailable<T>(data: T) { return { data, error: "Supabase environment variables are missing." }; }

export async function getVehicleReviews(modelId?: string, generationId?: string, page = 1) {
  if (!hasSupabaseEnv()) return { ...unavailable([] as VehicleReview[]), hasMore: false };
  const safePage = Number.isInteger(page) && page > 0 ? page : 1;
  let query = getSupabaseServerClient().schema("vehicle").from("owner_reviews")
    .select("id,make_id,model_id,generation_id,modification_id,rating,pros,cons,body,ownership_status,created_at")
    .eq("moderation_status", "approved").order("created_at", { ascending: false }).order("id", { ascending: false })
    .range((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  if (modelId) query = query.eq("model_id", modelId);
  if (generationId) query = query.eq("generation_id", generationId);
  const { data, error } = await query;
  const rows = (data ?? []) as VehicleReview[];
  return { data: rows.slice(0, PAGE_SIZE), error: error?.message ?? null, hasMore: rows.length > PAGE_SIZE };
}

export async function getReviewIdentity(makeId: string, modelId: string, generationId: string) {
  if (!hasSupabaseEnv()) return unavailable<ReviewIdentity | null>(null);
  const { data, error } = await getSupabaseServerClient().schema("vehicle").from("generations")
    .select("id,name,slug,models!inner(id,name,slug,makes!inner(id,name,slug))").eq("id", generationId).eq("model_id", modelId).maybeSingle();
  if (!data || error) return { data: null, error: error?.message ?? null };
  const row = data as unknown as { id: string; name: string; slug: string; models: { id: string; name: string; slug: string; makes: { id: string; name: string; slug: string } } };
  if (row.models.makes.id !== makeId) return { data: null, error: null };
  return { data: { makeId, makeName: row.models.makes.name, makeSlug: row.models.makes.slug, modelId, modelName: row.models.name, modelSlug: row.models.slug, generationId, generationName: row.name, generationSlug: row.slug }, error: null };
}

export async function getGenerationReviewListings(generationId: string) {
  if (!hasSupabaseEnv()) return unavailable([] as ReviewListing[]);
  const { data, error } = await getSupabaseServerClient().rpc("get_public_generation_review_listings", { p_generation_id: generationId, p_limit: 12 });
  return { data: (data ?? []) as ReviewListing[], error: error?.message ?? null };
}

export async function getListingReviewTarget(listingId: string) {
  if (!hasSupabaseEnv()) return unavailable<ReviewIdentity | null>(null);
  const { data, error } = await getSupabaseServerClient().rpc("get_public_listing_review_target", { p_listing_id: listingId }).maybeSingle();
  if (!data || error) return { data: null, error: error?.message ?? null };
  const row = data as Record<string, string>;
  return { data: { makeId: row.make_id, makeName: row.make_name, makeSlug: row.make_slug, modelId: row.model_id, modelName: row.model_name, modelSlug: row.model_slug, generationId: row.generation_id, generationName: row.generation_name, generationSlug: row.generation_slug }, error: null };
}

/** A bounded, approved-only aggregate for public comparison surfaces. */
export async function getApprovedReviewSummaries(generationIds: readonly string[]): Promise<ApprovedReviewSummary[]> {
  const ids = [...new Set(generationIds)].slice(0, 4);
  if (!ids.length || !hasSupabaseEnv()) return ids.map((generationId) => ({ generationId, count: 0, averageRating: null }));
  const { data } = await getSupabaseServerClient().schema("vehicle").from("owner_reviews")
    .select("generation_id,rating")
    .eq("moderation_status", "approved")
    .in("generation_id", ids)
    .order("created_at", { ascending: false })
    .limit(80);
  const values = new Map(ids.map((generationId) => [generationId, [] as number[]]));
  for (const row of (data ?? []) as Array<{ generation_id: string; rating: number }>) {
    const ratings = values.get(row.generation_id);
    if (ratings && ratings.length < 20) ratings.push(row.rating);
  }
  return ids.map((generationId) => {
    const ratings = values.get(generationId) ?? [];
    return { generationId, count: ratings.length, averageRating: ratings.length ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(2)) : null };
  });
}

export function reviewGenerationPath(identity: Pick<ReviewIdentity, "makeId" | "modelId" | "generationId">) {
  return `/reviews/model/${identity.modelId}/generation/${identity.generationId}?make=${identity.makeId}`;
}
