import type { City, Make, Model } from "@/lib/supabase/types";
import { selectedValues, type ListingSearchFilters } from "./search-params";
import type { SearchV1Request } from "./search-contract";

export function buildSearchRequest(
  filters: ListingSearchFilters,
  { makes, models, cities }: { makes: Make[]; models: Model[]; cities: City[] }
): SearchV1Request {
  const matchIds = (values: string, rows: object[], nameKey: string, idKey: string) => {
    const wanted = new Set(selectedValues(values));
    return rows.flatMap((row) => {
      const item = row as Record<string, unknown>;
      return wanted.has(String(item[nameKey] ?? "")) && item[idKey] ? [String(item[idKey])] : [];
    });
  };
  const integer = (value: string, max = Number.MAX_SAFE_INTEGER) => {
    if (!/^\d+$/.test(value)) return undefined;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed <= max ? parsed : undefined;
  };
  const decimal = (value: string, max: number) => {
    if (!/^\d+(?:\.\d)?$/.test(value)) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed <= max ? parsed : undefined;
  };
  const filtersRequest = compact({
    q: filters.q.trim() || undefined,
    make_ids: matchIds(filters.make, makes, "make_name", "make_id"),
    model_ids: matchIds(filters.model, models, "model_name", "model_id"),
    city_ids: matchIds(filters.city, cities, "city_name", "city_id"),
    price_min: integer(filters.priceMin), price_max: integer(filters.priceMax),
    year_min: integer(filters.yearMin, 32767), year_max: integer(filters.yearMax, 32767),
    mileage_max: integer(filters.mileageMax, 2147483647), fuel_types: selectedValues(filters.fuelType),
    transmissions: selectedValues(filters.transmission), body_types: selectedValues(filters.bodyType),
    drive_types: filters.driveType ? [filters.driveType] : [], colors: filters.color ? [filters.color] : [],
    condition: filters.condition || undefined, seller_types: filters.sellerType ? [filters.sellerType] : [],
    engine_volume_min: decimal(filters.engineVolume, 999.9), engine_volume_max: decimal(filters.engineVolume, 999.9),
    price_negotiable: filters.negotiableOnly || undefined, trade_in_accepted: filters.tradeOnly || undefined,
    has_photos: filters.onlyWithPhotos || undefined
  });

  return compact({ version: "v1" as const, limit: 24, sort: filters.sort, cursor: filters.cursor && typeof filters.cursor === "object" ? filters.cursor : undefined, filters: filtersRequest }) as SearchV1Request;
}

function compact<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item != null && (!Array.isArray(item) || item.length > 0)));
}
