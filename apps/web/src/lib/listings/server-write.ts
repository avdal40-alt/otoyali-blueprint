import "server-only";

import { z } from "zod";

export const listingIdSchema = z.string().uuid();

const nullableOptionalText = (max: number) => z.string().trim().min(1).max(max).nullable();
const fuelTypes = ["gasoline", "diesel", "hybrid", "electric", "lpg", "other"] as const;
const transmissionTypes = ["automatic", "manual", "semi_automatic"] as const;
const driveTypes = ["front", "rear", "awd", "4x4"] as const;
const damageStates = ["unknown", "none", "minor", "major", "painted", "replaced", "heavy_damage"] as const;
const imageMimeTypes = ["image/jpeg", "image/png", "image/webp"] as const;

const listingFields = {
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
  city: z.string().trim().min(1).max(120)
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

export const createListingSchema = z.object({
  ...listingFields,
  variantId: listingIdSchema.nullable(),
  cityId: listingIdSchema.nullable(),
  districtId: listingIdSchema.nullable()
}).strict().superRefine((value, context) => {
  validEngineVolume(value, context);
  if (value.districtId && !value.cityId) context.addIssue({ code: z.ZodIssueCode.custom, path: ["districtId"], message: "District requires a city." });
});

export const editListingSchema = z.object({
  ...listingFields,
  expectedListingUpdatedAt: z.string().datetime({ offset: true }),
  expectedVehicleUpdatedAt: z.string().datetime({ offset: true })
}).strict().superRefine(validEngineVolume);

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

export type ListingWriteRpcError = { code?: string | null };

export function listingWriteError(error: ListingWriteRpcError) {
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
  if (listingWriteError(error).status >= 500) console.error("Listing write failed", context);
  else console.warn("Listing write rejected", context);
}
