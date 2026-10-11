import { ACTIVE_MARKET_PROFILE_KEY, type MarketProfileKey } from "@/lib/market";

/** Stable application-level identifiers for locations. Database catalog UUIDs
 * remain the authority for listing and search requests; this contract only
 * contains presentation aliases and safe development fallbacks. */
export type LocationIdentifier = string;

export type LocationDataset =
  | { status: "available"; source: "legacy-yolmod-catalog"; cityAliases: Readonly<Record<LocationIdentifier, string>>; preferredCityNames: readonly string[] }
  | { status: "available"; source: "kazakhstan-mvp-regional-centers-2026-01-01"; cityAliases: Readonly<Record<LocationIdentifier, string>>; preferredCityNames: readonly string[] };

export type LocationDatasetResult =
  | { status: "available"; dataset: LocationDataset }
  | { status: "unavailable"; error: "LOCATION_DATASET_UNAVAILABLE"; reason: "country-location-dataset-not-configured" };

const LOCATION_DATASETS = {
  yolmodTurkey: {
    status: "available",
    source: "legacy-yolmod-catalog",
    cityAliases: { Istanbul: "İstanbul", İstanbul: "İstanbul", Izmir: "İzmir", İzmir: "İzmir", Ankara: "Ankara", Antalya: "Antalya" },
    preferredCityNames: ["İstanbul", "Ankara", "İzmir", "Antalya", "Bursa", "Adana", "Konya", "Gaziantep"]
  },
  // O-006: repository-versioned MVP seed based on the Bureau of National
  // Statistics' administrative-territorial units as of 2026-01-01. It is a
  // replaceable source boundary, not a claim of an official live integration.
  jolcarKazakhstan: {
    status: "available",
    source: "kazakhstan-mvp-regional-centers-2026-01-01",
    cityAliases: { Astana: "Astana", Almaty: "Almaty", Shymkent: "Shymkent", Semey: "Semey", Kokshetau: "Kokshetau", Aktobe: "Aktobe", Qonaev: "Qonaev", Atyrau: "Atyrau", Oral: "Oral", Taraz: "Taraz", Taldykorgan: "Taldykorgan", Karaganda: "Karaganda", Kostanay: "Kostanay", Kyzylorda: "Kyzylorda", Aktau: "Aktau", Pavlodar: "Pavlodar", Petropavl: "Petropavl", Turkistan: "Turkistan", Zhezkazgan: "Zhezkazgan", Oskemen: "Oskemen" },
    preferredCityNames: ["Astana", "Almaty", "Shymkent", "Karaganda", "Aktobe", "Taraz", "Pavlodar", "Oskemen", "Kostanay", "Atyrau"]
  }
} as const satisfies Record<MarketProfileKey, LocationDataset>;

export function getLocationDataset(marketKey: MarketProfileKey | string = ACTIVE_MARKET_PROFILE_KEY): LocationDatasetResult {
  const dataset = LOCATION_DATASETS[marketKey as MarketProfileKey];
  if (!dataset) {
    return { status: "unavailable", error: "LOCATION_DATASET_UNAVAILABLE", reason: "country-location-dataset-not-configured" };
  }
  return { status: "available", dataset };
}

export function getCityLabel(value: LocationIdentifier, marketKey: MarketProfileKey | string = ACTIVE_MARKET_PROFILE_KEY) {
  const result = getLocationDataset(marketKey);
  return result.status === "available" ? result.dataset.cityAliases[value] ?? value : value;
}

export function getPreferredCityNames(marketKey: MarketProfileKey | string = ACTIVE_MARKET_PROFILE_KEY): readonly string[] {
  const result = getLocationDataset(marketKey);
  return result.status === "available" ? result.dataset.preferredCityNames : [];
}
