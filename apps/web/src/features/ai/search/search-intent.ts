import { z } from "zod";

export const searchSortSchema = z.enum(["newest", "price_asc", "price_desc", "year_desc", "mileage_asc"]);
const uuid = z.string().uuid();
const optionalText = z.string().trim().min(1).max(120).optional();

/** Canonical, bounded representation of AI search state. IDs are server-resolved only. */
const searchIntentObject = z.object({
  query: optionalText,
  makeId: uuid.optional(), modelId: uuid.optional(), variantId: uuid.optional(),
  cityId: uuid.optional(), districtId: uuid.optional(),
  priceMin: z.number().int().nonnegative().optional(), priceMax: z.number().int().nonnegative().optional(),
  yearMin: z.number().int().min(1886).max(32767).optional(), yearMax: z.number().int().min(1886).max(32767).optional(),
  mileageMin: z.number().int().nonnegative().max(2147483647).optional(), mileageMax: z.number().int().nonnegative().max(2147483647).optional(),
  fuel: z.enum(["gasoline", "diesel", "lpg", "hybrid", "electric"]).optional(),
  transmission: z.enum(["automatic", "manual", "semi_automatic"]).optional(),
  bodyType: z.enum(["sedan", "hatchback", "suv", "coupe", "wagon", "pickup", "minivan", "commercial", "other"]).optional(),
  drivetrain: z.enum(["fwd", "rwd", "awd", "4wd"]).optional(), color: optionalText,
  condition: z.enum(["used", "new"]).optional(), sellerType: z.enum(["private", "dealer"]).optional(),
  hasPhotos: z.boolean().optional(), hasVideo: z.boolean().optional(), sort: searchSortSchema.optional()
}).strict();
export const searchIntentSchema = searchIntentObject.superRefine((value, ctx) => {
  for (const [min, max, label] of [[value.priceMin, value.priceMax, "price"], [value.yearMin, value.yearMax, "year"], [value.mileageMin, value.mileageMax, "mileage"]] as const) {
    if (min !== undefined && max !== undefined && min > max) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} range is invalid` });
  }
});
export type SearchIntent = z.infer<typeof searchIntentSchema>;

const patchFields = searchIntentObject.partial();
export const searchIntentPatchSchema = z.object({
  operation: z.enum(["set", "clear", "keep", "reset"]),
  values: patchFields.optional(),
  clear: z.array(z.enum(["query", "makeId", "modelId", "variantId", "cityId", "districtId", "priceMin", "priceMax", "yearMin", "yearMax", "mileageMin", "mileageMax", "fuel", "transmission", "bodyType", "drivetrain", "color", "condition", "sellerType", "hasPhotos", "hasVideo", "sort"])).max(24).optional()
}).strict().superRefine((value, ctx) => {
  if (value.operation === "set" && !value.values) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "set requires values" });
  if (value.operation === "clear" && (!value.clear || value.clear.length === 0)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "clear requires fields" });
});
export type SearchIntentPatch = z.infer<typeof searchIntentPatchSchema>;

export type SearchCatalog = { makes: CatalogRow[]; models: CatalogRow[]; variants: CatalogRow[]; cities: CatalogRow[]; districts: CatalogRow[] };
export type CatalogRow = { id: string; name: string; parentId?: string | null };
export type SearchClarification = { field: string; message: string; options?: string[]; unsupported?: boolean };

export function mergeSearchIntent(previous: SearchIntent, patch: SearchIntentPatch): SearchIntent {
  if (patch.operation === "reset") return {};
  if (patch.operation === "keep") return previous;
  const next: Record<string, unknown> = { ...previous };
  if (patch.operation === "clear") for (const field of patch.clear ?? []) delete next[field];
  if (patch.operation === "set") Object.assign(next, patch.values);
  return searchIntentSchema.parse(next);
}

export function resolveSearchText(text: string, catalog: SearchCatalog): { patch: SearchIntentPatch; clarification?: SearchClarification } {
  const normalized = normalize(text);
  if (/(baştan başla|filtreleri temizle|reset search|start over)/.test(normalized)) return { patch: { operation: "reset" } };
  if (/(doğrulanmış galeri|verified dealer)/.test(normalized)) return { patch: { operation: "keep" }, clarification: { field: "verifiedDealer", unsupported: true, message: "This filter is not available in the current Search v1 contract." } };
  if (/(hangisi en iyi|which is best|\bbetter\b)/.test(normalized)) return { patch: { operation: "keep" }, clarification: { field: "criteria", message: "Please specify the criteria to compare." } };
  if (/(daha yeni|daha ucuz|düşük kilometre|newer|cheaper|low mileage)/.test(normalized)) return { patch: { operation: "keep" }, clarification: { field: "threshold", message: "Please provide a year, price, or mileage threshold." } };
  const values: Record<string, unknown> = { ...numericFilters(normalized) };
  if (/\b(dizel|diesel)\b/.test(normalized)) values.fuel = "diesel";
  if (/\b(benzin|gasoline|petrol)\b/.test(normalized)) values.fuel = "gasoline";
  if (/\b(elektrik|electric)\b/.test(normalized)) values.fuel = "electric";
  if (/\b(otomatik|automatic)\b/.test(normalized)) values.transmission = "automatic";
  if (/\b(manuel|manual)\b/.test(normalized)) values.transmission = "manual";
  if (/\bsuv\b/.test(normalized)) values.bodyType = "suv";
  if (/(video olan|with video|cars with video)/.test(normalized)) values.hasVideo = true;
  if (/(fotoğraflı|with photos)/.test(normalized)) values.hasPhotos = true;
  if (/(en ucuz|cheapest)/.test(normalized)) values.sort = "price_asc";
  if (/(en yeni|newest)/.test(normalized)) values.sort = "newest";
  const resolution = resolveNamedEntities(normalized, catalog, values);
  return resolution.clarification ? { patch: { operation: "keep" }, clarification: resolution.clarification } : { patch: { operation: "set", values: searchIntentObject.partial().parse(values) } };
}

export function mapSearchIntentToSearchV1(intent: SearchIntent) {
  const filters = compact({ q: intent.query, make_ids: list(intent.makeId), model_ids: list(intent.modelId), variant_ids: list(intent.variantId), city_ids: list(intent.cityId), district_ids: list(intent.districtId), price_min: intent.priceMin, price_max: intent.priceMax, year_min: intent.yearMin, year_max: intent.yearMax, mileage_min: intent.mileageMin, mileage_max: intent.mileageMax, fuel_types: list(intent.fuel), transmissions: list(intent.transmission), body_types: list(intent.bodyType), drive_types: list(intent.drivetrain), colors: list(intent.color), condition: intent.condition, seller_types: list(intent.sellerType), has_photos: intent.hasPhotos, has_video: intent.hasVideo });
  return { version: "v1" as const, limit: 24, sort: intent.sort ?? "newest", filters };
}

function resolveNamedEntities(text: string, catalog: SearchCatalog, values: Record<string, unknown>) {
  const pairs: Array<["makeId" | "modelId" | "variantId" | "cityId" | "districtId", CatalogRow[], string]> = [["makeId", catalog.makes, "make"], ["modelId", catalog.models, "model"], ["variantId", catalog.variants, "variant"], ["cityId", catalog.cities, "city"], ["districtId", catalog.districts, "district"]];
  for (const [key, rows, label] of pairs) {
    const matches = rows.filter((row) => text.includes(normalize(row.name)));
    if (matches.length > 1) return { clarification: { field: label, message: `Please clarify the ${label}.`, options: matches.slice(0, 5).map((row) => row.name) } };
    if (matches.length === 1) values[key] = matches[0].id;
  }
  const model = catalog.models.find((row) => row.id === values.modelId);
  const variant = catalog.variants.find((row) => row.id === values.variantId);
  const district = catalog.districts.find((row) => row.id === values.districtId);
  if (model && values.makeId && model.parentId !== values.makeId) return { clarification: { field: "model", message: "The model does not belong to the selected make." } };
  if (variant && values.modelId && variant.parentId !== values.modelId) return { clarification: { field: "variant", message: "The variant does not belong to the selected model." } };
  if (district && values.cityId && district.parentId !== values.cityId) return { clarification: { field: "district", message: "The district does not belong to the selected city." } };
  return {};
}
export function normalizeNaturalLanguageNumber(value: string, kind: "price" | "mileage"): number | null {
  const normalized = normalize(value).replace(/\s+/g, " ").trim();
  if (kind === "price") {
    const composite = normalized.match(/(\d+(?:[.,]\d+)?)\s*(milyon|million)\s+(\d+(?:[.,]\d+)?)\s*(bin|thousand)/);
    if (composite) {
      const result = Math.round(Number(composite[1].replace(",", ".")) * 1e6 + Number(composite[3].replace(",", ".")) * 1e3);
      return Number.isSafeInteger(result) ? result : null;
    }
  }
  const pattern = kind === "price"
    ? /(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(milyon|million|m|bin|thousand)?\s*(?:tl|try)?/
    : /(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)\s*(bin|thousand|k)?\s*(?:km|kilometre)?/;
  const match = normalized.match(pattern);
  if (!match) return null;
  const raw = match[1];
  const suffix = match[2] ?? "";
  const multiplier = kind === "price"
    ? ({ milyon: 1e6, million: 1e6, m: 1e6, bin: 1e3, thousand: 1e3 }[suffix] ?? 1)
    : ({ bin: 1e3, thousand: 1e3, k: 1e3 }[suffix] ?? 1);
  const numeric = raw.includes(",") && raw.includes(".")
    ? Number(raw.replace(/[.,](?=\d{3}(?:[.,]|$))/g, "").replace(",", "."))
    : /^[0-9]{1,3}(?:[.,][0-9]{3})+$/.test(raw) ? Number(raw.replace(/[.,]/g, "")) : Number(raw.replace(",", "."));
  const result = Math.round(numeric * multiplier);
  return Number.isSafeInteger(result) && result >= 0 ? result : null;
}
function numericFilters(text: string) { const values: Record<string, number> = {}; const price = text.match(/(?:altı|altinda|under|below)\s*(\d+(?:[.,]\d+)?)\s*(milyon|million|m|bin|thousand)?\s*(?:tl)?/) ?? text.match(/(\d+(?:[.,]\d+)?)\s*(milyon|million|m|bin|thousand)?\s*(?:tl)?\s*(?:altı|altinda)/); if (price) values.priceMax = normalizeNaturalLanguageNumber(price[0], "price") ?? 0; const km = text.match(/(?:altında|altinda|under|below|less than)\s*(\d+(?:[.,]\d+)?)\s*(bin|thousand|k)?\s*(?:km|kilometre)/) ?? text.match(/(\d+(?:[.,]\d+)?)\s*(bin|thousand|k)?\s*(?:km|kilometre)\s*(?:altında|altinda)/); if (km) values.mileageMax = normalizeNaturalLanguageNumber(km[0], "mileage") ?? 0; const year = text.match(/(\d{4})\s*(?:ve üzeri|sonrası|or newer|newer than)/); if (year) values.yearMin = Number(year[1]) + (/sonrası|newer than/.test(text) ? 1 : 0); return values; }
function normalize(value: string) { return value.toLocaleLowerCase("tr-TR").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c"); }
function compact<T extends Record<string, unknown>>(value: T) { return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && (!Array.isArray(item) || item.length))); }
function list(value: unknown) { return value === undefined ? [] : [value]; }
