import "server-only";

import { getCities } from "@/lib/queries/cities";
import { getMakes, getModels } from "@/lib/queries/makes";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type { AiRequest, AiResponse, AiStructuredData, AiWarningCode } from "../domain/types";
import { mapSearchIntentToSearchV1, mergeSearchIntent, resolveSearchText, searchIntentSchema, type CatalogRow, type SearchCatalog, type SearchIntent } from "./search-intent";

type PublicSearchItem = { listing_id: string; make_name: string | null; model_name: string | null; variant_name: string | null; city_name: string | null; district_name: string | null; price_amount: number | null; currency: string | null; year: number | null; mileage_km: number | null; fuel_type: string | null; transmission: string | null; body_type: string | null; seller_type: string | null; photo_count: number; has_video: boolean };

/** Executes only the canonical public Search v1 RPC and returns a deliberately reduced public DTO. */
export async function executeNaturalLanguageSearch(request: AiRequest): Promise<AiResponse> {
  if (!hasSupabaseEnv()) return unavailable(request, "Search is unavailable while the catalog is not configured.");
  const catalog = await loadCatalog();
  const previous = searchIntentSchema.safeParse(readClientState(request));
  const parsed = resolveSearchText(request.userMessage, catalog);
  if (parsed.clarification) return response(request, parsed.clarification.unsupported ? "unsupported" : "needs_clarification", parsed.clarification.message, { type: "search_clarification", field: parsed.clarification.field, options: parsed.clarification.options ?? [], unsupported: Boolean(parsed.clarification.unsupported) });
  const intent = mergeSearchIntent(previous.success ? previous.data : {}, parsed.patch);
  const catalogIssue = validateCatalogRelations(intent, catalog);
  if (catalogIssue) return response(request, "needs_clarification", catalogIssue, { type: "search_clarification", field: "catalog", options: [], unsupported: false });
  const { data, error } = await getSupabaseServerClient().schema("marketplace").rpc("search_listings_v1", { p_request: mapSearchIntentToSearchV1(intent) });
  if (error) return unavailable(request, "Search is temporarily unavailable.");
  const items = Array.isArray((data as { items?: unknown })?.items) ? ((data as { items: PublicSearchItem[] }).items).map(publicItem) : [];
  return response(request, "success", request.locale === "tr" ? `${items.length} ilan bulundu.` : `${items.length} listings found.`, { type: "search_results", intent, count: items.length, listings: items });
}

async function loadCatalog(): Promise<SearchCatalog> {
  const [makes, models, cities] = await Promise.all([getMakes(), getModels(), getCities()]);
  const supabase = getSupabaseServerClient();
  const [variants, districts] = await Promise.all([
    supabase.schema("vehicle").from("variants").select("id,name,model_id").eq("is_active", true),
    supabase.schema("marketplace").from("districts").select("id,name,city_id").eq("is_active", true)
  ]);
  return {
    makes: makes.data.flatMap((row) => row.make_id && row.make_name ? [{ id: row.make_id, name: row.make_name }] : []),
    models: models.data.flatMap((row) => row.model_id && row.model_name ? [{ id: row.model_id, name: row.model_name, parentId: row.make_id }] : []),
    cities: cities.data.flatMap((row) => row.city_id && row.city_name ? [{ id: row.city_id, name: row.city_name }] : []),
    variants: (variants.data ?? []).flatMap((row) => row.id && row.name ? [{ id: row.id, name: row.name, parentId: row.model_id }] : []),
    districts: (districts.data ?? []).flatMap((row) => row.id && row.name ? [{ id: row.id, name: row.name, parentId: row.city_id }] : [])
  };
}

function readClientState(request: AiRequest): unknown { return (request.context.search as { intent?: unknown } | undefined)?.intent; }
function validateCatalogRelations(intent: SearchIntent, catalog: SearchCatalog) {
  const model = catalog.models.find((row) => row.id === intent.modelId); const variant = catalog.variants.find((row) => row.id === intent.variantId); const district = catalog.districts.find((row) => row.id === intent.districtId);
  if (intent.makeId && !catalog.makes.some((row) => row.id === intent.makeId)) return "The selected make is not available.";
  if (intent.modelId && (!model || (intent.makeId && model.parentId !== intent.makeId))) return "The selected model is not available for that make.";
  if (intent.variantId && (!variant || (intent.modelId && variant.parentId !== intent.modelId))) return "The selected variant is not available for that model.";
  if (intent.cityId && !catalog.cities.some((row) => row.id === intent.cityId)) return "The selected city is not available.";
  if (intent.districtId && (!district || (intent.cityId && district.parentId !== intent.cityId))) return "The selected district is not available for that city.";
  return null;
}
function publicItem(item: PublicSearchItem) { return { listingId: item.listing_id, make: item.make_name, model: item.model_name, variant: item.variant_name, city: item.city_name, district: item.district_name, priceAmount: item.price_amount, currency: item.currency, year: item.year, mileageKm: item.mileage_km, fuel: item.fuel_type, transmission: item.transmission, bodyType: item.body_type, sellerType: item.seller_type, photoCount: item.photo_count, hasVideo: item.has_video }; }
function response(request: AiRequest, status: AiResponse["status"], message: string, structuredData: AiStructuredData): AiResponse { const warnings: AiWarningCode[] = status === "success" ? ["informational_only"] : ["informational_only", "feature_not_connected"]; return { requestId: request.requestId, status, message, structuredData: [structuredData], warnings, provider: "local", latencyMs: 0 }; }
function unavailable(request: AiRequest, message: string) { return response(request, "unavailable", message, { type: "search_clarification", field: "availability", options: [], unsupported: true }); }
