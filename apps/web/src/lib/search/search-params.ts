export type SortOption = "newest" | "price_asc" | "price_desc" | "year_desc" | "mileage_asc";

export type ListingSearchFilters = {
  q: string;
  make: string;
  model: string;
  city: string;
  priceMin: string;
  priceMax: string;
  yearMin: string;
  yearMax: string;
  mileageMax: string;
  fuelType: string;
  transmission: string;
  bodyType: string;
  driveType: string;
  color: string;
  condition: string;
  sellerType: string;
  engineVolume: string;
  damageState: string;
  ownerCount: string;
  onlyWithPhotos: boolean;
  negotiableOnly: boolean;
  promotedOnly: boolean;
  tradeOnly: boolean;
  advanced: boolean;
  sort: SortOption;
};

export const defaultSearchFilters: ListingSearchFilters = {
  q: "",
  make: "",
  model: "",
  city: "",
  priceMin: "",
  priceMax: "",
  yearMin: "",
  yearMax: "",
  mileageMax: "",
  fuelType: "",
  transmission: "",
  bodyType: "",
  driveType: "",
  color: "",
  condition: "",
  sellerType: "",
  engineVolume: "",
  damageState: "",
  ownerCount: "",
  onlyWithPhotos: false,
  negotiableOnly: false,
  promotedOnly: false,
  tradeOnly: false,
  advanced: false,
  sort: "newest"
};

type RawSearchParams = Record<string, string | string[] | undefined>;

export function parseSearchParams(searchParams: RawSearchParams): ListingSearchFilters {
  const value = (...keys: string[]) => firstAvailable(searchParams, keys);
  const listValue = (...keys: string[]) => allValues(searchParams, keys).join(",");
  const sort = value("sort") as SortOption;

  return {
    ...defaultSearchFilters,
    q: value("q"),
    make: listValue("make"),
    model: listValue("model"),
    city: listValue("city"),
    priceMin: value("price_min", "priceMin", "min_price"),
    priceMax: value("price_max", "priceMax", "max_price"),
    yearMin: value("year_min", "yearMin", "min_year"),
    yearMax: value("year_max", "yearMax", "max_year"),
    mileageMax: value("max_mileage", "mileage_max", "mileageMax"),
    fuelType: listValue("fuel_type", "fuelType"),
    transmission: listValue("transmission"),
    bodyType: listValue("body_type", "bodyType"),
    driveType: value("drive_type", "driveType"),
    color: value("color"),
    condition: value("condition"),
    sellerType: value("seller_type", "sellerType"),
    engineVolume: value("engine_volume", "engineVolume"),
    damageState: value("damage_state", "damageState"),
    ownerCount: value("owner_count", "ownerCount"),
    onlyWithPhotos: isTruthy(value("with_photos", "onlyWithPhotos")),
    negotiableOnly: isTruthy(value("negotiable", "negotiableOnly")),
    promotedOnly: isTruthy(value("promoted", "promotedOnly")),
    tradeOnly: isTruthy(value("trade", "tradeOnly")),
    advanced: isTruthy(value("advanced")),
    sort: isSortOption(sort) ? sort : "newest"
  };
}

export function buildSearchUrl(filters: Partial<ListingSearchFilters>, path = "/search") {
  const params = new URLSearchParams();

  add(params, "q", filters.q);
  addList(params, "make", filters.make);
  addList(params, "model", filters.model);
  addList(params, "city", filters.city);
  add(params, "price_min", filters.priceMin);
  add(params, "price_max", filters.priceMax);
  add(params, "year_min", filters.yearMin);
  add(params, "year_max", filters.yearMax);
  add(params, "max_mileage", filters.mileageMax);
  addList(params, "fuel_type", filters.fuelType);
  addList(params, "transmission", filters.transmission);
  addList(params, "body_type", filters.bodyType);
  add(params, "drive_type", filters.driveType);
  add(params, "color", filters.color);
  add(params, "condition", filters.condition);
  add(params, "seller_type", filters.sellerType);
  add(params, "engine_volume", filters.engineVolume);
  add(params, "damage_state", filters.damageState);
  add(params, "owner_count", filters.ownerCount);
  add(params, "sort", filters.sort && filters.sort !== "newest" ? filters.sort : "");
  add(params, "with_photos", filters.onlyWithPhotos ? "1" : "");
  add(params, "negotiable", filters.negotiableOnly ? "1" : "");
  add(params, "promoted", filters.promotedOnly ? "1" : "");
  add(params, "trade", filters.tradeOnly ? "1" : "");
  add(params, "advanced", filters.advanced ? "1" : "");

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

export function hasActiveFilters(filters: ListingSearchFilters) {
  return Object.entries(filters).some(([key, value]) => {
    if (key === "sort") return value !== "newest";
    if (typeof value === "boolean") return value;
    return Boolean(value);
  });
}

export function selectedValues(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toggleSelectedValue(current: string, value: string) {
  const values = selectedValues(current);
  return values.includes(value)
    ? values.filter((item) => item !== value).join(",")
    : [...values, value].join(",");
}

function firstAvailable(searchParams: RawSearchParams, keys: string[]) {
  for (const key of keys) {
    const value = first(searchParams[key]);
    if (value) return value;
  }

  return "";
}

function allValues(searchParams: RawSearchParams, keys: string[]) {
  const values: string[] = [];

  for (const key of keys) {
    const raw = searchParams[key];
    const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const item of items) {
      values.push(...selectedValues(item));
    }
  }

  return Array.from(new Set(values));
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function add(params: URLSearchParams, key: string, value: string | boolean | undefined) {
  if (!value || value === "false") {
    return;
  }
  params.set(key, String(value));
}

function addList(params: URLSearchParams, key: string, value: string | undefined) {
  for (const item of selectedValues(value ?? "")) {
    params.append(key, item);
  }
}

function isTruthy(value: string) {
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function isSortOption(value: string): value is SortOption {
  return ["newest", "price_asc", "price_desc", "year_desc", "mileage_asc"].includes(value);
}
