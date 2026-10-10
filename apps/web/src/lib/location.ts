import { ACTIVE_MARKET_PROFILE_KEY, type MarketProfileKey } from "@/lib/market";

/** Stable application-level identifiers for locations. Database catalog UUIDs
 * remain the authority for listing and search requests; this contract only
 * contains presentation aliases and safe development fallbacks. */
export type LocationIdentifier = string;

export type LocationDataset =
  | { status: "available"; source: "legacy-yolmod-catalog"; cityAliases: Readonly<Record<LocationIdentifier, string>>; preferredCityNames: readonly string[] }
  | { status: "unavailable"; reason: "approved-country-city-source-required" };

export type LocationDatasetResult =
  | { status: "available"; dataset: Extract<LocationDataset, { status: "available" }> }
  | { status: "unavailable"; error: "LOCATION_DATASET_UNAVAILABLE"; reason: "approved-country-city-source-required" };

const LOCATION_DATASETS = {
  yolmodTurkey: {
    status: "available",
    source: "legacy-yolmod-catalog",
    cityAliases: { Istanbul: "İstanbul", İstanbul: "İstanbul", Izmir: "İzmir", İzmir: "İzmir", Ankara: "Ankara", Antalya: "Antalya" },
    preferredCityNames: ["İstanbul", "Ankara", "İzmir", "Antalya", "Bursa", "Adana", "Konya", "Gaziantep"]
  },
  // O-006 is open. Do not add guessed cities or a synthetic data source.
  jolcarKazakhstan: { status: "unavailable", reason: "approved-country-city-source-required" }
} as const satisfies Record<MarketProfileKey, LocationDataset>;

export function getLocationDataset(marketKey: MarketProfileKey = ACTIVE_MARKET_PROFILE_KEY): LocationDatasetResult {
  const dataset = LOCATION_DATASETS[marketKey];
  return dataset.status === "available"
    ? { status: "available", dataset }
    : { status: "unavailable", error: "LOCATION_DATASET_UNAVAILABLE", reason: dataset.reason };
}

export function getCityLabel(value: LocationIdentifier, marketKey: MarketProfileKey = ACTIVE_MARKET_PROFILE_KEY) {
  const result = getLocationDataset(marketKey);
  return result.status === "available" ? result.dataset.cityAliases[value] ?? value : value;
}

export function getPreferredCityNames(marketKey: MarketProfileKey = ACTIVE_MARKET_PROFILE_KEY): readonly string[] {
  const result = getLocationDataset(marketKey);
  return result.status === "available" ? result.dataset.preferredCityNames : [];
}
