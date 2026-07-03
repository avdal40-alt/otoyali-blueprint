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
  onlyWithPhotos: boolean;
  negotiableOnly: boolean;
  promotedOnly: boolean;
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
  onlyWithPhotos: false,
  negotiableOnly: false,
  promotedOnly: false,
  advanced: false,
  sort: "newest"
};

type RawSearchParams = Record<string, string | string[] | undefined>;

export function parseSearchParams(searchParams: RawSearchParams): ListingSearchFilters {
  const value = (key: string, fallbackKey?: string) => first(searchParams[key]) || (fallbackKey ? first(searchParams[fallbackKey]) : "") || "";
  const sort = value("sort") as SortOption;

  return {
    ...defaultSearchFilters,
    q: value("q"),
    make: value("make"),
    model: value("model"),
    city: value("city"),
    priceMin: value("priceMin", "price_min"),
    priceMax: value("priceMax", "price_max"),
    yearMin: value("yearMin", "year_min"),
    yearMax: value("yearMax", "year_max"),
    mileageMax: value("mileageMax", "mileage_max"),
    fuelType: value("fuelType", "fuel_type"),
    transmission: value("transmission"),
    onlyWithPhotos: isTruthy(value("onlyWithPhotos", "with_photos")),
    negotiableOnly: isTruthy(value("negotiableOnly", "negotiable")),
    promotedOnly: isTruthy(value("promotedOnly", "promoted")),
    advanced: isTruthy(value("advanced")),
    sort: isSortOption(sort) ? sort : "newest"
  };
}

export function buildSearchUrl(filters: Partial<ListingSearchFilters>, path = "/search") {
  const params = new URLSearchParams();

  add(params, "q", filters.q);
  add(params, "make", filters.make);
  add(params, "model", filters.model);
  add(params, "city", filters.city);
  add(params, "priceMin", filters.priceMin);
  add(params, "priceMax", filters.priceMax);
  add(params, "yearMin", filters.yearMin);
  add(params, "yearMax", filters.yearMax);
  add(params, "mileageMax", filters.mileageMax);
  add(params, "fuelType", filters.fuelType);
  add(params, "transmission", filters.transmission);
  add(params, "sort", filters.sort && filters.sort !== "newest" ? filters.sort : "");
  add(params, "onlyWithPhotos", filters.onlyWithPhotos ? "1" : "");
  add(params, "negotiableOnly", filters.negotiableOnly ? "1" : "");
  add(params, "promotedOnly", filters.promotedOnly ? "1" : "");
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

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function add(params: URLSearchParams, key: string, value: string | boolean | undefined) {
  if (!value || value === "false") {
    return;
  }
  params.set(key, String(value));
}

function isTruthy(value: string) {
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function isSortOption(value: string): value is SortOption {
  return ["newest", "price_asc", "price_desc", "year_desc", "mileage_asc"].includes(value);
}
