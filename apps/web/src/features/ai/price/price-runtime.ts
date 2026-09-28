import "server-only";

import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import {
  PRICE_INTELLIGENCE_RULES,
  calculatePriceIntelligence,
  type PriceComparable,
  type PriceComparableTier,
  type PriceIntelligenceResult,
  type PriceSimilarityTier
} from "./price-intelligence";

type SearchResponse = { items?: unknown };
type PriceSpecification = "fuel" | "transmission" | "bodyType";
type SearchDocument = {
  listing_id: string;
  make_id: string | null;
  model_id: string | null;
  condition: string | null;
  year: number | null;
  mileage_km: number | null;
  fuel_type: string | null;
  transmission: string | null;
  body_type: string | null;
  currency: string | null;
  price_amount: number | null;
  published_at: string | null;
};

const publicDocumentColumns = "listing_id,make_id,model_id,condition,year,mileage_km,fuel_type,transmission,body_type,currency,price_amount,published_at";

/** Reads only the canonical Search v1 public projection and never calls an AI provider. */
export async function analyzePublicListingPrice(listingId: string, now = new Date()): Promise<PriceIntelligenceResult> {
  if (!hasSupabaseEnv()) return { available: false, reason: "invalid_target", rawComparableCount: 0, usableComparableCount: 0 };
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.schema("marketplace").from("listing_search_documents").select(publicDocumentColumns).eq("listing_id", listingId).maybeSingle();
  if (error || !data) return { available: false, reason: "invalid_target", rawComparableCount: 0, usableComparableCount: 0 };
  const target = toComparable(data as SearchDocument);
  const tiers: PriceComparableTier[] = [];

  for (const definition of PRICE_INTELLIGENCE_RULES.tiers) {
    tiers.push({ id: definition.id, candidates: await searchTier(supabase, target, definition.id) });
    const result = calculatePriceIntelligence(target, tiers, now);
    if (result.available) return result;
  }

  return calculatePriceIntelligence(target, tiers, now);
}

async function searchTier(supabase: ReturnType<typeof getSupabaseServerClient>, target: PriceComparable, tier: PriceSimilarityTier) {
  const definition = PRICE_INTELLIGENCE_RULES.tiers.find((item) => item.id === tier)!;
  if (!target.makeId || !target.modelId || !target.condition || target.year === null || target.mileageKm === null) return [];
  const filters: Record<string, unknown> = {
    make_ids: [target.makeId],
    model_ids: [target.modelId],
    condition: target.condition,
    year_min: target.year - definition.yearWindow,
    year_max: target.year + definition.yearWindow,
    mileage_min: Math.max(0, target.mileageKm - mileageWindow(target.mileageKm, definition)),
    mileage_max: target.mileageKm + mileageWindow(target.mileageKm, definition)
  };
  const requiredSpecifications = definition.requiredSpecifications as readonly PriceSpecification[];
  if (requiredSpecifications.includes("fuel") && target.fuel) filters.fuel_types = [target.fuel];
  if (requiredSpecifications.includes("transmission") && target.transmission) filters.transmissions = [target.transmission];
  if (requiredSpecifications.includes("bodyType") && target.bodyType) filters.body_types = [target.bodyType];

  const { data, error } = await supabase.schema("marketplace").rpc("search_listings_v1", {
    p_request: { version: "v1", limit: PRICE_INTELLIGENCE_RULES.maximumComparableCount, sort: "newest", filters }
  });
  if (error || !data || typeof data !== "object") return [];
  const items = (data as SearchResponse).items;
  return Array.isArray(items) ? items.flatMap((item) => isSearchDocument(item) ? [toComparable(item)] : []) : [];
}

function toComparable(row: SearchDocument): PriceComparable {
  return {
    listingId: row.listing_id,
    makeId: row.make_id,
    modelId: row.model_id,
    condition: row.condition,
    year: row.year,
    mileageKm: row.mileage_km,
    fuel: row.fuel_type,
    transmission: row.transmission,
    bodyType: row.body_type,
    currency: row.currency,
    priceAmount: row.price_amount,
    publishedAt: row.published_at,
    publicEligible: true
  };
}

function isSearchDocument(value: unknown): value is SearchDocument {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return typeof row.listing_id === "string" && nullableString(row.make_id) && nullableString(row.model_id) && nullableString(row.condition) && nullableNumber(row.year) && nullableNumber(row.mileage_km) && nullableString(row.fuel_type) && nullableString(row.transmission) && nullableString(row.body_type) && nullableString(row.currency) && nullableNumber(row.price_amount) && nullableString(row.published_at);
}

function nullableString(value: unknown): value is string | null { return value === null || typeof value === "string"; }
function nullableNumber(value: unknown): value is number | null { return value === null || typeof value === "number"; }
function mileageWindow(mileageKm: number, tier: (typeof PRICE_INTELLIGENCE_RULES.tiers)[number]) { return Math.round(tier.mileageBaseWindow + mileageKm * tier.mileageFraction); }
