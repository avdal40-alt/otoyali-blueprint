import "server-only";

import { z } from "zod";
import type { AuthenticatedRequestSupabase } from "@/lib/supabase/request";
import type { LocationIdentifier } from "@/lib/location";
import { safeLog } from "@/lib/observability/safe-logger";
import { createCorrelationId, observeOperation } from "@/lib/observability/telemetry";

export const listingIdSchema = z.string().uuid();

const nullableOptionalText = (max: number) => z.string().trim().min(1).max(max).nullable();
const fuelTypes = ["gasoline", "diesel", "hybrid", "electric", "lpg", "other"] as const;
const transmissionTypes = ["automatic", "manual", "semi_automatic"] as const;
const driveTypes = ["front", "rear", "awd", "4x4"] as const;
const damageStates = ["unknown", "none", "minor", "major", "painted", "replaced", "heavy_damage"] as const;
const imageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;
const locationNameSchema = z.string().trim().min(1).max(120).transform((value): LocationIdentifier => value);

/** Canonical safe listing fields shared by server-side draft workflows. */
export const listingFields = {
  makeId: listingIdSchema,
  modelId: listingIdSchema,
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  mileageKm: z.number().int().min(0),
  condition: z.enum(["used", "new"]),
  fuelType: z.enum(fuelTypes),
  transmission: z.enum(transmissionTypes),
  bodyType: nullableOptionalText(120),
  driveType: z.enum(driveTypes).nullable(),
  color: nullableOptionalText(80),
  engineVolumeL: z.number().positive().max(999.9).nullable(),
  damageState: z.enum(damageStates).nullable(),
  ownerCount: z.number().int().positive().max(32767).nullable(),
  description: z.string().trim().max(8000).nullable(),
  priceAmount: z.string().regex(/^[1-9][0-9]{0,18}$/),
  currency: z.string().regex(/^[A-Z]{3}$/),
  priceNegotiable: z.boolean(),
  city: locationNameSchema
} as const;

const validEngineVolume = (value: { fuelType: string; engineVolumeL: number | null }, context: z.RefinementCtx) => {
  if (value.fuelType === "electric" && value.engineVolumeL !== null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["engineVolumeL"], message: "Electric vehicles cannot include engine volume." });
  }
  if (value.fuelType !== "electric" && value.engineVolumeL === null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["engineVolumeL"], message: "Engine volume is required." });
  }
  if (value.engineVolumeL !== null && Math.round(value.engineVolumeL * 10) !== value.engineVolumeL * 10) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["engineVolumeL"], message: "Engine volume supports one decimal place." });
  }
};

const validConditionMileage = (value: { condition: "used" | "new"; mileageKm: number }, context: z.RefinementCtx) => {
  if (value.condition === "new" && value.mileageKm !== 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["mileageKm"], message: "New listings must have zero mileage." });
  }
  if (value.condition === "used" && value.mileageKm <= 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["mileageKm"], message: "Used listings require mileage greater than zero." });
  }
};

export const createListingSchema = z.object({
  ...listingFields,
  variantId: listingIdSchema.nullable(),
  cityId: listingIdSchema.nullable(),
  districtId: listingIdSchema.nullable(),
  sellerContactPhoneId: listingIdSchema
}).strict().superRefine((value, context) => {
  validEngineVolume(value, context);
  validConditionMileage(value, context);
  if (value.districtId && !value.cityId) context.addIssue({ code: z.ZodIssueCode.custom, path: ["districtId"], message: "District requires a city." });
});

export const editListingSchema = z.object({
  ...listingFields,
  expectedListingUpdatedAt: z.string().datetime({ offset: true }),
  expectedVehicleUpdatedAt: z.string().datetime({ offset: true })
}).strict().superRefine((value, context) => {
  validEngineVolume(value, context);
  validConditionMileage(value, context);
});

export const mediaAttachmentSchema = z.object({
  mediaId: listingIdSchema,
  storagePath: z.string().trim().min(1).max(1024),
  originalPath: z.string().trim().min(1).max(1024).nullable(),
  largePath: z.string().trim().min(1).max(1024).nullable(),
  cardPath: z.string().trim().min(1).max(1024).nullable(),
  thumbPath: z.string().trim().min(1).max(1024).nullable(),
  sortOrder: z.number().int().min(0).max(32767),
  isCover: z.boolean(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  aspectRatio: z.number().positive().nullable(),
  mimeType: z.enum(imageMimeTypes).nullable(),
  sizeBytes: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).nullable(),
  processedStatus: z.enum(["processed", "failed"])
}).strict();

export const coverMediaSchema = z.object({ coverMediaId: listingIdSchema.nullable() }).strict();

export type ListingWriteRpcError = { code?: string | null; message?: string | null };

export function listingWriteError(error: ListingWriteRpcError) {
  if (error.code === "OT403" && error.message === "seller phone verification required") return { status: 403, message: "SELLER_PHONE_VERIFICATION_REQUIRED" };
  if (error.code === "OT422" && error.message === "at least three finalized photos are required") {
    return { status: 422, message: "İlanı incelemeye göndermek için en az 3 tamamlanmış fotoğraf ekleyin." };
  }
  if (error.code === "OT422" && error.message === "a finalized cover photo is required") {
    return { status: 422, message: "İlanı incelemeye göndermek için tamamlanmış bir kapak fotoğrafı seçin." };
  }
  switch (error.code) {
    case "OT401": return { status: 401, message: "Oturum doğrulanamadı." };
    case "OT403": return { status: 403, message: "Bu işlem için yetkiniz yok." };
    case "OT404": return { status: 404, message: "İlan bulunamadı." };
    case "OT409": return { status: 409, message: "İlan değişti. Lütfen yenileyip tekrar deneyin." };
    case "OT422": return { status: 422, message: "İstek geçerli değil." };
    default: return { status: 500, message: "İlan işlemi tamamlanamadı." };
  }
}

export function logListingWriteFailure(action: string, error: ListingWriteRpcError, userId: string, listingId?: string) {
  const context = { action, code: error.code ?? null, userId, listingId: listingId ?? null };
  safeLog(listingWriteError(error).status >= 500 ? "error" : "warn", "listing_write_failed", context);
}

/** The sole application write boundary for listing create, edit, and lifecycle submission. */
export async function createOwnListingDraft(authenticated: AuthenticatedRequestSupabase, payload: z.infer<typeof createListingSchema>) {
  const { data, error } = await observeOperation({ path: "db", operation: "listing.create_draft", correlationId: createCorrelationId("db") }, () => authenticated.supabase.rpc("create_own_listing_draft_v2", {
    p_make_id: payload.makeId, p_model_id: payload.modelId, p_variant_id: payload.variantId, p_year: payload.year, p_mileage_km: payload.mileageKm, p_condition: payload.condition, p_fuel_type: payload.fuelType, p_transmission: payload.transmission, p_body_type: payload.bodyType, p_drive_type: payload.driveType, p_color: payload.color, p_engine_volume_l: payload.engineVolumeL, p_damage_state: payload.damageState, p_owner_count: payload.ownerCount, p_description: payload.description, p_price_amount_text: payload.priceAmount, p_currency: payload.currency, p_price_negotiable: payload.priceNegotiable, p_city: payload.city, p_seller_contact_phone_id: payload.sellerContactPhoneId, p_city_id: payload.cityId, p_district_id: payload.districtId
  }), (result) => Boolean(result.error));
  if (error) return { error: listingWriteError(error), rawError: error } as const;
  const row = Array.isArray(data) ? data[0] : data;
  const result = row && typeof row === "object" ? row as { listing_id?: string; vehicle_profile_id?: string; created_at?: string } : null;
  return result?.listing_id && result.vehicle_profile_id && result.created_at ? { data: { listingId: result.listing_id, vehicleProfileId: result.vehicle_profile_id, createdAt: result.created_at } } as const : { error: { status: 500, message: "İlan işlemi tamamlanamadı." } } as const;
}

export async function saveOwnRejectedListing(authenticated: AuthenticatedRequestSupabase, listingId: string, payload: z.infer<typeof editListingSchema>) {
  const { data, error } = await authenticated.supabase.rpc("save_own_listing_edit", { p_listing_id: listingId, p_expected_listing_updated_at: payload.expectedListingUpdatedAt, p_expected_vehicle_updated_at: payload.expectedVehicleUpdatedAt, p_make_id: payload.makeId, p_model_id: payload.modelId, p_year: payload.year, p_mileage_km: payload.mileageKm, p_condition: payload.condition, p_fuel_type: payload.fuelType, p_transmission: payload.transmission, p_body_type: payload.bodyType, p_drive_type: payload.driveType, p_color: payload.color, p_engine_volume_l: payload.engineVolumeL, p_damage_state: payload.damageState, p_owner_count: payload.ownerCount, p_description: payload.description, p_price_amount_text: payload.priceAmount, p_currency: payload.currency, p_price_negotiable: payload.priceNegotiable, p_city: payload.city });
  if (error) return { error: listingWriteError(error), rawError: error } as const;
  const row = Array.isArray(data) ? data[0] : data; const result = row && typeof row === "object" ? row as Record<string, unknown> : null;
  return result ? { data: { listingId: result.saved_listing_id, listingUpdatedAt: result.saved_listing_updated_at, vehicleUpdatedAt: result.saved_vehicle_updated_at, status: result.saved_status, moderationStatus: result.saved_moderation_status, title: result.saved_title, titleGenerated: result.saved_title_generated } } as const : { error: { status: 500, message: "İlan işlemi tamamlanamadı." } } as const;
}

export const listingContactSwitchSchema = z.object({ sellerContactPhoneId: listingIdSchema }).strict();

export async function setOwnListingSellerContactPhone(authenticated: AuthenticatedRequestSupabase, listingId: string, sellerContactPhoneId: string) {
  const { error } = await authenticated.supabase.rpc("set_own_listing_seller_contact_phone", {
    p_listing_id: listingId,
    p_seller_contact_phone_id: sellerContactPhoneId
  });
  if (error) return { error: listingWriteError(error), rawError: error } as const;
  return { data: { listingId, sellerContactPhoneId } } as const;
}

export async function submitOwnListing(authenticated: AuthenticatedRequestSupabase, listingId: string, operation: "submit" | "resubmit") {
  const { data, error } = await authenticated.supabase.rpc(operation === "submit" ? "submit_own_listing_for_review" : "resubmit_own_listing_for_review", { p_listing_id: listingId });
  if (error) return { error: listingWriteError(error), rawError: error } as const;
  const row = Array.isArray(data) ? data[0] : data; const result = row && typeof row === "object" ? row as { listing_id?: string; status?: string; moderation_status?: string } : null;
  return result?.listing_id && result.status && result.moderation_status ? { data: { listingId: result.listing_id, status: result.status, moderationStatus: result.moderation_status } } as const : { error: { status: 500, message: "İlan işlemi tamamlanamadı." } } as const;
}
