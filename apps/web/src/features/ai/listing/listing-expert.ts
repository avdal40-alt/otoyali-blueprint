import "server-only";
import { z } from "zod";
import { getListingDetails } from "@/lib/queries/listings";
import type { AiProvenance, AiRequest, AiResponse, AiStructuredData } from "../domain/types";

export const publicListingIdSchema = z.string().uuid();
export const compareListingIdsSchema = z.array(publicListingIdSchema).min(2).max(4).refine((ids) => new Set(ids).size === ids.length, "listing ids must be unique");
export type ListingFact = { label: string; value: string | number | boolean; provenance: AiProvenance };
export type ListingSnapshot = { listingId: string; facts: ListingFact[]; missingFields: string[]; description: string | null };

/** Server-derived public listing view. It deliberately never returns the source DTO or media URLs. */
export async function getPublicListingSnapshot(listingId: string): Promise<ListingSnapshot | null> {
  if (!publicListingIdSchema.safeParse(listingId).success) return null;
  const result = await getListingDetails(listingId);
  const row = result.data;
  if (!row) return null;
  const values: Array<[string, string | number | boolean | null | undefined, AiProvenance]> = [
    ["make", row.make_name, "listing"], ["model", row.model_name, "listing"], ["year", row.year, "listing"], ["mileageKm", row.mileage_km, "listing"], ["price", row.price_amount, "listing"], ["currency", row.currency, "listing"], ["fuel", row.fuel_type, "listing"], ["transmission", row.transmission, "listing"], ["drivetrain", row.drive_type, "listing"], ["bodyType", row.body_type, "listing"], ["engineVolumeL", row.engine_volume_l, "listing"], ["city", row.city, "listing"], ["sellerType", row.seller_type, "listing"], ["hasPublicVideo", Boolean(row.video_count && row.video_count > 0), "listing"], ["photoCount", row.media_count, "listing"]
  ];
  return { listingId: row.listing_id, facts: values.flatMap(([label, value, provenance]) => value === null || value === undefined ? [] : [{ label, value, provenance }]), missingFields: values.filter(([, value]) => value === null || value === undefined).map(([label]) => label).concat(["galeriVerifiedPublicSignal", "sellerDamageDeclaration", "serviceHistory"]), description: row.description?.slice(0, 280) ?? null };
}

export async function executeListingExpert(request: AiRequest): Promise<AiResponse> {
  const ids: unknown = request.intent === "compare_vehicles" ? readCompareIds(request) : request.context.listing?.listingId ? [request.context.listing.listingId] : [];
  if (request.intent === "compare_vehicles") {
    const parsed = compareListingIdsSchema.safeParse(ids);
    if (!parsed.success) return clarify(request, "Provide between two and four distinct public listings to compare.");
    const snapshots = await Promise.all(parsed.data.map(getPublicListingSnapshot));
    if (snapshots.some((snapshot) => !snapshot)) return clarify(request, "One or more selected listings are not publicly available.");
    const safe = snapshots as ListingSnapshot[];
    const matrix = comparisonMatrix(safe);
    const best = /hangisi daha iyi|which is best/.test(request.userMessage.toLowerCase()) ? "Specify a factual criterion; Yolmod does not choose an overall winner." : numericSummary(matrix, request.userMessage);
    return answer(request, best, { type: "listing_comparison", listings: safe.map((snapshot) => ({ listingId: snapshot.listingId, missingFields: snapshot.missingFields })), matrix });
  }
  const listingId = Array.isArray(ids) && typeof ids[0] === "string" ? ids[0] : null;
  const snapshot = listingId ? await getPublicListingSnapshot(listingId) : null;
  if (!snapshot) return clarify(request, "This listing is not publicly available.");
  const fact = selectFact(snapshot, request.userMessage);
  const message = fact ? `${fact.label}: ${String(fact.value)}.` : `This information is not specified in the listing.`;
  return answer(request, message, { type: "listing_answer", listingId: snapshot.listingId, facts: fact ? [fact] : [], missingFields: fact ? [] : snapshot.missingFields });
}

function readCompareIds(request: AiRequest): unknown { return (request.context.search as { compareListingIds?: unknown } | undefined)?.compareListingIds; }
function selectFact(snapshot: ListingSnapshot, question: string) { const q = question.toLocaleLowerCase("tr-TR"); const key = /otomatik|vites|transmission/.test(q) ? "transmission" : /kilometre|km|mileage/.test(q) ? "mileageKm" : /motor|hacim|engine/.test(q) ? "engineVolumeL" : /yakıt|fuel/.test(q) ? "fuel" : /çekiş|drivetrain/.test(q) ? "drivetrain" : /video/.test(q) ? "hasPublicVideo" : /fiyat|price/.test(q) ? "price" : /şehir|city/.test(q) ? "city" : /galeri|seller/.test(q) ? "sellerType" : null; return key ? snapshot.facts.find((fact) => fact.label === key) : null; }
function comparisonMatrix(snapshots: ListingSnapshot[]) { const labels = ["price", "year", "mileageKm", "fuel", "transmission", "drivetrain", "bodyType", "engineVolumeL", "sellerType", "hasPublicVideo", "city"]; return labels.map((label) => ({ field: label, listings: snapshots.map((snapshot) => ({ listingId: snapshot.listingId, value: snapshot.facts.find((fact) => fact.label === label)?.value ?? null, provenance: "listing" as const })) })); }
function numericSummary(matrix: ReturnType<typeof comparisonMatrix>, question: string) { const q = question.toLowerCase(); const field = /kilometre|mileage/.test(q) ? "mileageKm" : /yeni|newer|year/.test(q) ? "year" : /ucuz|cheap|price/.test(q) ? "price" : null; if (!field) return "Here is a neutral field-by-field comparison."; const row = matrix.find((item) => item.field === field)!; const values = row.listings.filter((item): item is typeof item & { value: number } => typeof item.value === "number"); if (!values.length) return "The requested comparison value is not specified."; const selected = field === "year" ? values.reduce((a, b) => a.value > b.value ? a : b) : values.reduce((a, b) => a.value < b.value ? a : b); return `${selected.listingId} has the ${field === "year" ? "newest year" : field === "price" ? "lowest price" : "lowest mileage"}.`; }
function answer(request: AiRequest, message: string, structuredData: AiStructuredData): AiResponse { return { requestId: request.requestId, status: "success", message, structuredData: [structuredData], warnings: ["informational_only", "verify_independently"], provider: "local", latencyMs: 0 }; }
function clarify(request: AiRequest, message: string): AiResponse { return { requestId: request.requestId, status: "needs_clarification", message, warnings: ["informational_only"], provider: "local", latencyMs: 0 }; }
