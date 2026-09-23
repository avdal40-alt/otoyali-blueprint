import "server-only";

import { z } from "zod";
import type { AuthenticatedRequestSupabase } from "@/lib/supabase/request";
import { createListingSchema, createOwnListingDraft, editListingSchema, listingIdSchema, saveOwnRejectedListing, submitOwnListing } from "@/lib/listings/server-write";
import { applySellDraftPatch, extractSellerDeclarations, getMissingRequiredFields, getNextSellQuestion, getSellAmbiguity, normalizeSellNumber, processSellDraftTurn, sellDraftPatchSchema, sellDraftSchema, type SellDraft, type SellDraftPatch } from "./sell-draft";

const actionSchema = z.enum(["turn", "prepare_create", "prepare_update", "confirm_create", "confirm_update", "confirm_submit", "cancel", "generate_description", "regenerate_description", "discard_description", "apply_description"]);
export const sellAssistantRequestSchema = z.object({ locale: z.enum(["tr", "en"]), message: z.string().trim().max(2000).optional(), draft: sellDraftSchema, listingId: listingIdSchema.optional(), action: actionSchema.default("turn"), descriptionMode: z.enum(["concise", "standard", "detailed"]).default("standard"), descriptionPreview: z.string().trim().max(8000).optional() }).strict();
type SellAssistantRequest = z.infer<typeof sellAssistantRequestSchema>;
type PendingAction = "create" | "update" | "submit" | null;

export type SellAssistantState = { draft: SellDraft; listingId?: string; pendingAction: PendingAction; phase: "editing" | "review_ready" | "awaiting_confirmation" | "saved" | "description_preview"; descriptionPreview?: string; missingFields: string[]; nextQuestion?: string; clarification?: { field: string; message: string }; readyForReview: boolean };

/** Authenticated, ephemeral runtime: only explicit structured confirmations reach the shared listing-write boundary. */
export async function runSellAssistant(authenticated: AuthenticatedRequestSupabase, input: unknown): Promise<{ ok: true; state: SellAssistantState; write?: Record<string, unknown> } | { ok: false; code: string; status: number }> {
  const parsed = sellAssistantRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input", status: 422 };
  const request = parsed.data;
  const base: { draft: SellDraft; expectedListingUpdatedAt?: string; expectedVehicleUpdatedAt?: string } | null = request.listingId ? await loadOwnEditableDraft(authenticated, request.listingId) : { draft: request.draft };
  if (!base) return { ok: false, code: "listing_not_found", status: 404 };
  const patch: SellDraftPatch = request.message ? extractDeterministicPatch(request.message, base.draft) : { changes: [{ field: "city", operation: "keep" }] };
  let draft = applySellDraftPatch(base.draft, patch);
  if (request.action === "apply_description") {
    if (!request.descriptionPreview || !isSafeDescription(request.descriptionPreview)) return { ok: false, code: "invalid_input", status: 422 };
    draft = applySellDraftPatch(draft, { changes: [{ field: "description", operation: "set", value: request.descriptionPreview }] });
  }
  const missingFields = getMissingRequiredFields(draft);
  const clarification = request.message ? getSellAmbiguity(request.message, request.locale) : undefined;
  const readyForReview = missingFields.length === 0 && !clarification;
  const state = (overrides: Partial<SellAssistantState> = {}): SellAssistantState => ({ draft, listingId: request.listingId, pendingAction: null, phase: readyForReview ? "review_ready" : "editing", missingFields, nextQuestion: clarification ? undefined : getNextSellQuestion(draft, request.locale), clarification, readyForReview, ...overrides });

  if (request.action === "cancel") return { ok: true, state: state() };
  if (["generate_description", "regenerate_description"].includes(request.action)) {
    if (!readyForReview) return { ok: false, code: "not_ready", status: 422 };
    const preview = generateDescription(draft, request.locale, request.descriptionMode, request.message ?? "");
    return { ok: true, state: state({ phase: "description_preview", descriptionPreview: preview }) };
  }
  if (request.action === "discard_description") return { ok: true, state: state() };
  if (request.action === "prepare_create" || request.action === "prepare_update") {
    if (!readyForReview || (request.action === "prepare_create" && request.listingId) || (request.action === "prepare_update" && !request.listingId)) return { ok: false, code: "not_ready", status: 422 };
    return { ok: true, state: state({ phase: "awaiting_confirmation", pendingAction: request.action === "prepare_create" ? "create" : "update" }) };
  }
  if (request.action === "confirm_create") {
    if (!readyForReview || request.listingId) return { ok: false, code: "confirmation_required", status: 422 };
    const valid = createListingSchema.safeParse(draft); if (!valid.success) return { ok: false, code: "not_ready", status: 422 };
    const write = await createOwnListingDraft(authenticated, valid.data); if ("error" in write) return { ok: false, code: "generic_failure", status: write.error?.status ?? 500 };
    return { ok: true, state: state({ listingId: write.data.listingId, phase: "saved" }), write: write.data };
  }
  if (request.action === "confirm_update") {
    if (!readyForReview || !request.listingId || !base.expectedListingUpdatedAt || !base.expectedVehicleUpdatedAt) return { ok: false, code: "confirmation_required", status: 422 };
    const valid = editListingSchema.safeParse({ ...draft, expectedListingUpdatedAt: base.expectedListingUpdatedAt, expectedVehicleUpdatedAt: base.expectedVehicleUpdatedAt }); if (!valid.success) return { ok: false, code: "not_ready", status: 422 };
    const write = await saveOwnRejectedListing(authenticated, request.listingId, valid.data); if ("error" in write) return { ok: false, code: "generic_failure", status: write.error?.status ?? 500 };
    return { ok: true, state: state({ phase: "saved" }), write: write.data };
  }
  if (request.action === "confirm_submit") {
    if (!request.listingId) return { ok: false, code: "confirmation_required", status: 422 };
    const write = await submitOwnListing(authenticated, request.listingId, "submit"); if ("error" in write) return { ok: false, code: "not_editable", status: write.error?.status ?? 500 };
    return { ok: true, state: state({ phase: "saved", pendingAction: "submit" }), write: write.data };
  }
  return { ok: true, state: state() };
}

async function loadOwnEditableDraft(authenticated: AuthenticatedRequestSupabase, listingId: string) {
  const { data, error } = await authenticated.supabase.rpc("get_own_rejected_listing_for_edit", { p_listing_id: listingId });
  if (error || !data || typeof data !== "object") return null;
  const row = data as { listing?: Record<string, unknown>; vehicle?: Record<string, unknown> }; const listing = row.listing; const vehicle = row.vehicle;
  if (!listing || !vehicle) return null;
  const parsed = sellDraftSchema.safeParse({ makeId: vehicle.make_id, modelId: vehicle.model_id, year: vehicle.year, mileageKm: vehicle.mileage_km, condition: vehicle.condition, fuelType: vehicle.fuel_type, transmission: vehicle.transmission, bodyType: vehicle.body_type, driveType: vehicle.drive_type, color: vehicle.color, engineVolumeL: vehicle.engine_volume_l, damageState: vehicle.damage_state, ownerCount: vehicle.owner_count, description: listing.description, priceAmount: listing.price_amount == null ? undefined : String(listing.price_amount), currency: listing.currency, priceNegotiable: listing.price_negotiable, city: listing.city });
  return parsed.success && typeof listing.updated_at === "string" && typeof vehicle.updated_at === "string" ? { draft: parsed.data, expectedListingUpdatedAt: listing.updated_at, expectedVehicleUpdatedAt: vehicle.updated_at } : null;
}

function extractDeterministicPatch(message: string, current: SellDraft): SellDraftPatch {
  const text = message.toLocaleLowerCase("tr-TR"); const changes: SellDraftPatch["changes"] = [];
  const mileage = /(?:kilometre|km)\D{0,24}([\d.,]+\s*(?:bin|k)?)/i.exec(message); if (mileage) { const value = normalizeSellNumber(mileage[1], "mileage"); if (value !== null) changes.push({ field: "mileageKm", operation: "set", value }); }
  const price = /(?:fiyat|price)\D{0,24}([\d.,]+\s*(?:(?:milyon|million|bin|thousand|m))?(?:\s+\d+\s*(?:bin|thousand))?)/i.exec(message); if (price) { const value = normalizeSellNumber(price[1], "price"); if (value && value > 0) changes.push({ field: "priceAmount", operation: "set", value: String(value) }); }
  const year = /\b(19\d{2}|20\d{2})\b/.exec(message); if (year) changes.push({ field: "year", operation: "set", value: Number(year[1]) });
  if (/\b(siyah|black)\b/.test(text)) changes.push({ field: "color", operation: "set", value: "black" }); if (/\b(beyaz|white)\b/.test(text)) changes.push({ field: "color", operation: "set", value: "white" });
  if (/\b(otomatik|automatic)\b/.test(text)) changes.push({ field: "transmission", operation: "set", value: "automatic" }); if (/\b(manuel|manual)\b/.test(text)) changes.push({ field: "transmission", operation: "set", value: "manual" });
  if (/\b(benzin|gasoline|petrol)\b/.test(text)) changes.push({ field: "fuelType", operation: "set", value: "gasoline" }); if (/\b(dizel|diesel)\b/.test(text)) changes.push({ field: "fuelType", operation: "set", value: "diesel" }); if (/\b(elektrik|electric)\b/.test(text)) changes.push({ field: "fuelType", operation: "set", value: "electric" });
  if (/\b(ikinci el|used)\b/.test(text)) changes.push({ field: "condition", operation: "set", value: "used" }); if (/\b(sıfır|new)\b/.test(text)) changes.push({ field: "condition", operation: "set", value: "new" });
  return sellDraftPatchSchema.parse({ changes: changes.length ? changes : [{ field: "city", operation: "keep" }] });
}

function generateDescription(draft: SellDraft, locale: "tr" | "en", mode: "concise" | "standard" | "detailed", sellerText: string) {
  const facts = [draft.year, draft.color, draft.fuelType, draft.transmission, draft.mileageKm !== undefined ? `${draft.mileageKm} km` : undefined].filter(Boolean).join(" · ");
  const declarations = extractSellerDeclarations(sellerText).map((item) => locale === "tr" ? `Satıcının beyanına göre ${item.text}` : `According to the seller's declaration: ${item.text}`);
  const base = locale === "tr" ? `${draft.year ?? ""} ${draft.color ?? ""} araç. ${facts}`.trim() : `${draft.year ?? ""} ${draft.color ?? ""} vehicle. ${facts}`.trim();
  return [base, mode === "detailed" && draft.city ? (locale === "tr" ? `Araç ${draft.city} konumundadır.` : `The vehicle is located in ${draft.city}.`) : "", ...declarations].filter(Boolean).join(" ").slice(0, 8000);
}
function isSafeDescription(value: string) { return !/(?:\+?\d[\d\s().-]{7,}\d|[\w.+-]+@[\w.-]+\.[a-z]{2,}|https?:\/\/|whatsapp|telegram)/i.test(value); }
