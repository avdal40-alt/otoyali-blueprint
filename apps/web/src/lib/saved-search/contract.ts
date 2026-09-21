export const savedSearchResponseHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Authorization"
};

const requestKeys = new Set(["version", "filters", "cursor", "limit", "sort"]);
const filterKeys = new Set([
  "q", "condition", "make_ids", "model_ids", "variant_ids", "price_min", "price_max", "year_min", "year_max",
  "mileage_min", "mileage_max", "city_ids", "district_ids", "fuel_types", "transmissions", "body_types", "drive_types",
  "colors", "seller_types", "engine_volume_min", "engine_volume_max", "power_kw_min", "power_kw_max",
  "battery_capacity_kwh_min", "battery_capacity_kwh_max", "electric_range_km_min", "electric_range_km_max",
  "seller_service_declarations", "seller_damage_declarations", "trade_in_accepted", "price_negotiable", "has_photos", "has_video"
]);

export type SavedSearchRequest = Record<string, unknown>;

export function isSavedSearchRequest(value: unknown): value is SavedSearchRequest {
  if (!isPlainObject(value) || value.version !== "v1") return false;
  if (Object.keys(value).some((key) => !requestKeys.has(key))) return false;
  if ("cursor" in value && value.cursor !== null) return false;
  if ("filters" in value && (!isPlainObject(value.filters) || Object.keys(value.filters).some((key) => !filterKeys.has(key)))) return false;
  return true;
}

export function parseSavedSearchId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) ? value : null;
}

export function rpcErrorStatus(code: string | null | undefined) {
  if (code === "OT401") return 401;
  if (code === "OT422") return 422;
  if (code === "OT429") return 429;
  // The database deliberately treats non-owned IDs as unavailable.
  if (code === "OT403" || code === "OT404") return 404;
  return 500;
}

export function rpcErrorMessage(status: number) {
  if (status === 401) return "Oturum gerekli.";
  if (status === 422) return "Geçersiz kayıtlı arama.";
  if (status === 429) return "En fazla 5 arama kaydedebilirsiniz.";
  if (status === 404) return "Kayıtlı arama kullanılamıyor.";
  return "Kayıtlı arama şu anda kullanılamıyor.";
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
