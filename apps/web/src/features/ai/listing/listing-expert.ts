import "server-only";

import { z } from "zod";
import { getListingDetails } from "@/lib/queries/listings";
import { getApprovedReviewSummaries, getListingReviewTarget } from "@/lib/queries/reviews";
import { getPublicCanonicalGenerations, type PublicCanonicalGeneration } from "@/lib/queries/vehicle-comparison";
import { getAiListingExpertMessages } from "@/i18n/dictionaries/ai-listing-expert";
import type { AiProvenance, AiRequest, AiResponse, AiStructuredData } from "../domain/types";

export const publicListingIdSchema = z.string().uuid();
export const compareListingIdsSchema = z.array(publicListingIdSchema).min(2).max(4).refine((ids) => new Set(ids).size === ids.length, "listing ids must be unique");
export const compareGenerationIdsSchema = z.array(publicListingIdSchema).min(2).max(4).refine((ids) => new Set(ids).size === ids.length, "generation ids must be unique");
export type ListingFact = { label: string; value: string | number | boolean; provenance: AiProvenance };
export type ListingSnapshot = { listingId: string; facts: ListingFact[]; missingFields: string[] };

/** Server-derived public listing view. It deliberately never returns the source DTO or media URLs. */
export async function getPublicListingSnapshot(listingId: string): Promise<ListingSnapshot | null> {
  if (!publicListingIdSchema.safeParse(listingId).success) return null;
  const result = await getListingDetails(listingId);
  const row = result.data;
  if (!row) return null;
  const values: Array<[string, string | number | boolean | null | undefined, AiProvenance]> = [
    ["make", row.make_name, "listing"], ["model", row.model_name, "listing"], ["year", row.year, "listing"], ["mileageKm", row.mileage_km, "listing"], ["price", row.price_amount, "listing"], ["currency", row.currency, "listing"], ["fuel", row.fuel_type, "listing"], ["transmission", row.transmission, "listing"], ["drivetrain", row.drive_type, "listing"], ["bodyType", row.body_type, "listing"], ["engineVolumeL", row.engine_volume_l, "listing"], ["city", row.city, "listing"], ["sellerType", row.seller_type, "listing"], ["hasPublicVideo", Boolean(row.video_count && row.video_count > 0), "listing"], ["photoCount", row.media_count, "listing"]
  ];
  return { listingId: row.listing_id, facts: values.flatMap(([label, value, provenance]) => value === null || value === undefined ? [] : [{ label, value, provenance }]), missingFields: values.filter(([, value]) => value === null || value === undefined).map(([label]) => label).concat(["canonicalGeneration", "approvedOwnerReviews", "serviceHistory"]) };
}

type ComparisonItem = {
  id: string;
  source: "listing" | "catalog";
  label: string;
  facts: ListingFact[];
  missingFields: string[];
  generationId: string | null;
};

export async function executeListingExpert(request: AiRequest): Promise<AiResponse> {
  if (request.intent === "compare_vehicles") return executeComparison(request);
  const listingId = request.context.listing?.listingId;
  const snapshot = listingId ? await getPublicListingSnapshot(listingId) : null;
  const messages = getAiListingExpertMessages(request.locale);
  if (!snapshot) return clarify(request, messages.listingUnavailable);
  const fact = selectFact(snapshot, request.userMessage);
  const message = fact ? messages.factAnswer(fact.label, fact.value) : messages.factUnavailable;
  return answer(request, message, { type: "listing_answer", listingId: snapshot.listingId, facts: fact ? [fact] : [], missingFields: fact ? [] : snapshot.missingFields });
}

async function executeComparison(request: AiRequest): Promise<AiResponse> {
  const messages = getAiListingExpertMessages(request.locale);
  const listingIds = readCompareListingIds(request);
  const generationIds = readCompareGenerationIds(request);
  if (!listingIds && !generationIds) return clarify(request, messages.comparisonItemsRequired);

  const [listingItems, catalogItems] = await Promise.all([
    listingIds ? loadListingItems(listingIds) : Promise.resolve([] as ComparisonItem[]),
    generationIds ? loadCatalogItems(generationIds) : Promise.resolve([] as ComparisonItem[])
  ]);
  if ((listingIds && listingItems.length !== listingIds.length) || (generationIds && catalogItems.length !== generationIds.length)) {
    return clarify(request, messages.comparisonUnavailable);
  }
  const items = [...listingItems, ...catalogItems];
  if (items.length < 2 || items.length > 4) return clarify(request, messages.comparisonCountRequired);

  const matrix = comparisonMatrix(items);
  return answer(request, comparisonNarrative(matrix, request.userMessage, request.locale), {
    type: "vehicle_comparison",
    items: items.map(({ id, source, label, missingFields }) => ({ id, source, label, missingFields })),
    matrix
  });
}

async function loadListingItems(listingIds: string[]): Promise<ComparisonItem[]> {
  const snapshots = await Promise.all(listingIds.map(getPublicListingSnapshot));
  if (snapshots.some((snapshot) => !snapshot)) return [];
  const safeSnapshots = snapshots as ListingSnapshot[];
  const targets = await Promise.all(safeSnapshots.map((snapshot) => getListingReviewTarget(snapshot.listingId)));
  const generationIds = targets.flatMap((target) => target.data?.generationId ? [target.data.generationId] : []);
  const [generations, reviewSummaries] = await Promise.all([getPublicCanonicalGenerations(generationIds), getApprovedReviewSummaries(generationIds)]);
  const generationById = new Map(generations.map((generation) => [generation.generationId, generation]));
  const reviewsByGeneration = new Map(reviewSummaries.map((summary) => [summary.generationId, summary]));
  return safeSnapshots.map((snapshot, index) => toListingItem(snapshot, targets[index].data?.generationId ?? null, generationById, reviewsByGeneration));
}

async function loadCatalogItems(generationIds: string[]): Promise<ComparisonItem[]> {
  const [generations, summaries] = await Promise.all([getPublicCanonicalGenerations(generationIds), getApprovedReviewSummaries(generationIds)]);
  const reviewsByGeneration = new Map(summaries.map((summary) => [summary.generationId, summary]));
  return generations.map((generation) => toCatalogItem(generation, reviewsByGeneration));
}

function toListingItem(snapshot: ListingSnapshot, generationId: string | null, generations: Map<string, PublicCanonicalGeneration>, reviews: Map<string, { count: number; averageRating: number | null }>): ComparisonItem {
  const generation = generationId ? generations.get(generationId) : undefined;
  const review = generationId ? reviews.get(generationId) : undefined;
  const facts = [...snapshot.facts];
  if (generation) facts.push({ label: "canonicalGeneration", value: generation.generationName, provenance: "catalog" }, { label: "canonicalModel", value: generation.modelName, provenance: "catalog" });
  if (review?.count) facts.push({ label: "approvedReviewCount", value: review.count, provenance: "review" }, { label: "approvedReviewAverageRating", value: review.averageRating!, provenance: "review" });
  const missingFields = snapshot.missingFields.filter((field) => field !== "canonicalGeneration" && field !== "approvedOwnerReviews");
  if (!generation) missingFields.push("canonicalGeneration");
  if (!review?.count) missingFields.push("approvedOwnerReviews");
  return { id: snapshot.listingId, source: "listing", label: labelFromFacts(snapshot.facts, snapshot.listingId), facts, missingFields, generationId };
}

function toCatalogItem(generation: PublicCanonicalGeneration, reviews: Map<string, { count: number; averageRating: number | null }>): ComparisonItem {
  const review = reviews.get(generation.generationId);
  const facts: ListingFact[] = [{ label: "make", value: generation.makeName, provenance: "catalog" }, { label: "model", value: generation.modelName, provenance: "catalog" }, { label: "canonicalGeneration", value: generation.generationName, provenance: "catalog" }];
  if (review?.count) facts.push({ label: "approvedReviewCount", value: review.count, provenance: "review" }, { label: "approvedReviewAverageRating", value: review.averageRating!, provenance: "review" });
  return { id: generation.generationId, source: "catalog", label: [generation.makeName, generation.modelName, generation.generationName].join(" "), facts, missingFields: review?.count ? [] : ["approvedOwnerReviews"], generationId: generation.generationId };
}

function readCompareListingIds(request: AiRequest): string[] | null { const parsed = compareListingIdsSchema.safeParse(request.context.search?.compareListingIds); return parsed.success ? parsed.data : null; }
function readCompareGenerationIds(request: AiRequest): string[] | null { const parsed = compareGenerationIdsSchema.safeParse(request.context.search?.compareGenerationIds); return parsed.success ? parsed.data : null; }
function selectFact(snapshot: ListingSnapshot, question: string) { const q = question.normalize("NFKD").toLowerCase().replace(/\p{Diacritic}/gu, ""); const key = /otomatik|vites|transmission|автомат|беріліс|变速/.test(q) ? "transmission" : /kilometre|km|mileage|пробег|жүріс|里程/.test(q) ? "mileageKm" : /motor|hacim|engine|двигател|қозғалтқыш|发动机/.test(q) ? "engineVolumeL" : /yakıt|fuel|топливо|жанармай|燃料/.test(q) ? "fuel" : /çekiş|drivetrain|привод|жетек|驱动/.test(q) ? "drivetrain" : /video|видео|бейне/.test(q) ? "hasPublicVideo" : /fiyat|price|цена|баға|价格/.test(q) ? "price" : /şehir|city|город|қала|城市/.test(q) ? "city" : /galeri|seller|дилер|сатушы|卖家/.test(q) ? "sellerType" : null; return key ? snapshot.facts.find((fact) => fact.label === key) : null; }
function comparisonMatrix(items: ComparisonItem[]) { const fields = ["make", "model", "canonicalGeneration", "year", "mileageKm", "price", "currency", "fuel", "transmission", "drivetrain", "bodyType", "engineVolumeL", "sellerType", "hasPublicVideo", "photoCount", "approvedReviewCount", "approvedReviewAverageRating"]; return fields.map((field) => ({ field, values: items.map((item) => { const fact = item.facts.find((candidate) => candidate.label === field); return { itemId: item.id, value: fact?.value ?? null, provenance: fact?.provenance ?? (field.startsWith("approvedReview") ? "review" : item.source === "catalog" ? "catalog" : "listing") }; }) })); }
function comparisonNarrative(matrix: ReturnType<typeof comparisonMatrix>, question: string, locale: AiRequest["locale"]) {
  const messages = getAiListingExpertMessages(locale);
  const q = question.normalize("NFKD").toLowerCase().replace(/\p{Diacritic}/gu, "");
  if (/hangisi daha iyi|which is best|overall winner|какой лучше|қайсысы жақсы|哪个更好/.test(q)) return messages.criterionRequired;
  const field = /kilometre|mileage|пробег|жүріс|里程/.test(q) ? "mileageKm" : /yeni|newer|year|новее|жаңарақ|年份/.test(q) ? "year" : /ucuz|cheap|price|дешевле|арзан|价格|便宜/.test(q) ? "price" : null;
  if (!field) return messages.genericComparison;
  const row = matrix.find((item) => item.field === field)!;
  const values = row.values.filter((item): item is typeof item & { value: number } => typeof item.value === "number");
  if (!values.length) return messages.comparisonValueUnavailable;
  const selected = field === "year" ? values.reduce((a, b) => a.value > b.value ? a : b) : values.reduce((a, b) => a.value < b.value ? a : b);
  return messages.selectedComparison(selected.itemId, field === "year" ? messages.newestYear : field === "price" ? messages.lowestPrice : messages.lowestMileage);
}
function labelFromFacts(facts: ListingFact[], fallback: string) { return ["make", "model", "year"].map((field) => facts.find((fact) => fact.label === field)?.value).filter((value) => value !== undefined).join(" ") || fallback; }
function answer(request: AiRequest, message: string, structuredData: AiStructuredData): AiResponse { return { requestId: request.requestId, status: "success", message, structuredData: [structuredData], warnings: ["informational_only", "verify_independently", "incomplete_data"], provider: "local", latencyMs: 0 }; }
function clarify(request: AiRequest, message: string): AiResponse { return { requestId: request.requestId, status: "needs_clarification", message, warnings: ["informational_only", "incomplete_data"], provider: "local", latencyMs: 0 }; }
