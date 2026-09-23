import "server-only";

import { z } from "zod";
import { listingFields } from "@/lib/listings/server-write";
import { normalizeNaturalLanguageNumber, resolveSearchText, type SearchCatalog } from "../search/search-intent";

const sellFieldNames = ["makeId", "modelId", "variantId", "year", "mileageKm", "condition", "fuelType", "transmission", "bodyType", "driveType", "color", "engineVolumeL", "damageState", "ownerCount", "description", "priceAmount", "currency", "priceNegotiable", "city", "cityId", "districtId"] as const;
export type SellDraftField = typeof sellFieldNames[number];
const sellDraftShape = {
  ...listingFields,
  variantId: listingFields.makeId.nullable(),
  cityId: listingFields.makeId.nullable(),
  districtId: listingFields.makeId.nullable()
};

/** Incomplete by design: final listing validation remains at the existing write boundary. */
export const sellDraftSchema = z.object(sellDraftShape).partial().strict();
export type SellDraft = z.infer<typeof sellDraftSchema>;

const patchChangeSchema = z.object({
  field: z.enum(sellFieldNames),
  operation: z.enum(["set", "clear", "keep"]),
  value: z.unknown().optional()
}).strict().superRefine((change, context) => {
  const hasValue = Object.prototype.hasOwnProperty.call(change, "value");
  if (change.operation === "set") {
    if (!hasValue) context.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "SET requires a value." });
    else {
      const parsed = sellDraftShape[change.field].safeParse(change.value);
      if (!parsed.success) context.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: "SET value is invalid." });
    }
  } else if (hasValue) context.addIssue({ code: z.ZodIssueCode.custom, path: ["value"], message: `${change.operation.toUpperCase()} cannot include a value.` });
});

export const sellDraftPatchSchema = z.object({ changes: z.array(patchChangeSchema).min(1).max(sellFieldNames.length) }).strict().superRefine((patch, context) => {
  const seen = new Set<string>();
  patch.changes.forEach((change, index) => {
    if (seen.has(change.field)) context.addIssue({ code: z.ZodIssueCode.custom, path: ["changes", index, "field"], message: "A field can be changed once per patch." });
    seen.add(change.field);
  });
});
export type SellDraftPatch = z.infer<typeof sellDraftPatchSchema>;

export function applySellDraftPatch(currentDraft: SellDraft, patch: SellDraftPatch): SellDraft {
  const current = sellDraftSchema.parse(currentDraft);
  const parsedPatch = sellDraftPatchSchema.parse(patch);
  const next: Record<string, unknown> = { ...current };
  for (const change of parsedPatch.changes) {
    if (change.operation === "clear") delete next[change.field];
    if (change.operation === "set") next[change.field] = change.value;
  }
  return sellDraftSchema.parse(next);
}

export function normalizeSellNumber(text: string, kind: "price" | "mileage"): number | null {
  return normalizeNaturalLanguageNumber(text, kind);
}

export type SellResolution = { patch: SellDraftPatch; clarification?: SellClarification };
export type SellClarification = { field: string; message: string; options?: string[] };

/** Resolves text exclusively through the AI-01B catalog/location resolver; arbitrary IDs are never accepted. */
export function resolveSellCatalogText(text: string, catalog: SearchCatalog): SellResolution {
  const resolved = resolveSearchText(text, catalog);
  if (resolved.clarification) return { patch: { changes: [{ field: "makeId", operation: "keep" }] }, clarification: resolved.clarification };
  const values = resolved.patch.operation === "set" ? resolved.patch.values ?? {} : {};
  const changes = (["makeId", "modelId", "variantId", "cityId", "districtId"] as const).flatMap((field) => typeof values[field] === "string" ? [{ field, operation: "set" as const, value: values[field] }] : []);
  return { patch: { changes: changes.length ? changes : [{ field: "makeId", operation: "keep" }] } };
}

const requiredFields: SellDraftField[] = ["makeId", "modelId", "year", "mileageKm", "condition", "fuelType", "transmission", "priceAmount", "currency", "priceNegotiable", "city"];
export function getMissingRequiredFields(draft: SellDraft): SellDraftField[] {
  const parsed = sellDraftSchema.parse(draft);
  const missing = requiredFields.filter((field) => parsed[field] === undefined);
  if (parsed.fuelType === "electric") return missing;
  return parsed.fuelType !== undefined && parsed.engineVolumeL === undefined ? [...missing, "engineVolumeL"] : missing;
}

const questions: Record<"tr" | "en", Partial<Record<SellDraftField, string>>> = {
  tr: { makeId: "Aracın markası nedir?", modelId: "Aracın modeli nedir?", year: "Aracın model yılı nedir?", mileageKm: "Aracın kilometresi nedir?", condition: "Araç yeni mi, ikinci el mi?", fuelType: "Yakıt türü nedir?", transmission: "Vites türü nedir?", engineVolumeL: "Motor hacmi nedir?", priceAmount: "İstenen fiyat nedir?", currency: "Para birimi nedir?", priceNegotiable: "Fiyat pazarlığa açık mı?", city: "Araç hangi şehirde?" },
  en: { makeId: "What is the vehicle make?", modelId: "What is the vehicle model?", year: "What is the model year?", mileageKm: "What is the mileage?", condition: "Is the vehicle new or used?", fuelType: "What is the fuel type?", transmission: "What is the transmission type?", engineVolumeL: "What is the engine volume?", priceAmount: "What is the asking price?", currency: "What is the currency?", priceNegotiable: "Is the price negotiable?", city: "Which city is the vehicle in?" }
} as const;
export function getNextSellQuestion(draft: SellDraft, locale: "tr" | "en"): string | undefined {
  const field = getMissingRequiredFields(draft)[0];
  return field ? questions[locale][field] : undefined;
}

export function getSellAmbiguity(text: string, locale: "tr" | "en"): SellClarification | undefined {
  if (!/(^|\s)(full|temiz|kusursuz|en dolusu)(\s|$)/i.test(text)) return undefined;
  return { field: "condition", message: locale === "tr" ? "Lütfen donanım, hasar veya boya bilgisini açıkça belirtin." : "Please state equipment, damage, or paint details explicitly." };
}

export type SellerDeclaration = { text: string; category: "accident" | "paint" | "replacement"; provenance: "seller_declaration"; verified: false };
export function extractSellerDeclarations(text: string): SellerDeclaration[] {
  const normalized = text.trim();
  if (/\bkazasız\b/i.test(normalized)) return [{ text: normalized, category: "accident", provenance: "seller_declaration", verified: false }];
  if (/\bboyalı\b/i.test(normalized)) return [{ text: normalized, category: "paint", provenance: "seller_declaration", verified: false }];
  if (/\bdeğişmiş\b/i.test(normalized)) return [{ text: normalized, category: "replacement", provenance: "seller_declaration", verified: false }];
  return [];
}

export type SellDraftTurnResult = { draft: SellDraft; patch: SellDraftPatch; missingFields: SellDraftField[]; nextQuestion?: string; clarification?: SellClarification; declarations: SellerDeclaration[]; readyForReview: boolean };
export function processSellDraftTurn(currentDraft: SellDraft, patch: SellDraftPatch, locale: "tr" | "en", text = ""): SellDraftTurnResult {
  const draft = applySellDraftPatch(currentDraft, patch);
  const missingFields = getMissingRequiredFields(draft);
  const clarification = getSellAmbiguity(text, locale);
  return { draft, patch: sellDraftPatchSchema.parse(patch), missingFields, nextQuestion: clarification ? undefined : getNextSellQuestion(draft, locale), clarification, declarations: extractSellerDeclarations(text), readyForReview: missingFields.length === 0 && !clarification };
}
