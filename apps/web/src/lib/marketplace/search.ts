import { localizePath } from "@/i18n/config";
import type { Locale } from "@/i18n/types";
import { MARKETPLACE_ATTRIBUTE_DEFINITIONS } from "./attributes";
import type { MarketplaceFilterDefinition, MarketplaceSearchRequest, MarketplaceVerticalId } from "./types";
import { canUseVerticalCapability, getMarketplaceVertical, resolveMarketplaceVertical } from "./verticals";

export const DEFAULT_MARKETPLACE_SEARCH_VERTICAL: MarketplaceVerticalId = "cars";

const sharedFilters: MarketplaceFilterDefinition[] = [
  filter("query", "search.title", "text", "q", ["cars", "commercial", "marine", "parts", "services"]),
  filter("city", "search.city", "select", "city", ["cars", "commercial", "marine", "parts", "services"]),
  filter("price", "search.priceMin", "number_range", "price", ["cars", "commercial", "marine", "parts"])
];

export function getMarketplaceSearchConfig(verticalId: MarketplaceVerticalId = DEFAULT_MARKETPLACE_SEARCH_VERTICAL) {
  const vertical = getMarketplaceVertical(verticalId);
  const attributes = MARKETPLACE_ATTRIBUTE_DEFINITIONS[vertical.id] ?? [];

  return {
    vertical: vertical.id,
    enabled: canUseVerticalCapability(vertical, "canSearch"),
    filters: [
      ...sharedFilters.filter((definition) => definition.supportedVerticals.includes(vertical.id)),
      ...attributes
        .filter((definition) => definition.filterable)
        .map<MarketplaceFilterDefinition>((definition) => ({
          id: definition.id,
          labelKey: definition.labelKey,
          type: definition.valueType === "boolean" ? "boolean" : definition.valueType === "multi_select" ? "multi_select" : definition.valueType === "number" ? "number_range" : "select",
          queryParam: definition.id,
          supportedVerticals: [vertical.id]
        }))
    ],
    sorts: vertical.id === "cars" ? ["newest", "price_asc", "price_desc", "year_desc", "mileage_asc"] : ["newest"]
  };
}

export function normalizeMarketplaceSearchRequest(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
  fallbackVertical: MarketplaceVerticalId = DEFAULT_MARKETPLACE_SEARCH_VERTICAL
): MarketplaceSearchRequest {
  const read = (key: string) => {
    if (params instanceof URLSearchParams) return params.get(key) ?? undefined;
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const vertical = resolveMarketplaceVertical(read("vertical") ?? fallbackVertical);

  return {
    vertical,
    query: read("q"),
    filters: Object.fromEntries(
      getMarketplaceSearchConfig(vertical).filters.map((definition) => [definition.id, read(definition.queryParam) ?? null])
    ),
    sort: read("sort") ?? "newest",
    page: Number(read("page") ?? 1)
  };
}

export function getSearchRouteForVertical(verticalId: MarketplaceVerticalId, locale: Locale) {
  const vertical = getMarketplaceVertical(verticalId);
  if (vertical.id === "cars") return localizePath("/search", locale);
  return localizePath(`${vertical.routes.tr}?vertical=${vertical.id}`, locale);
}

function filter(
  id: string,
  labelKey: string,
  type: MarketplaceFilterDefinition["type"],
  queryParam: string,
  supportedVerticals: MarketplaceVerticalId[]
): MarketplaceFilterDefinition {
  return {
    id,
    labelKey,
    type,
    queryParam,
    supportedVerticals
  };
}
