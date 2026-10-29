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

/**
 * Presentation-only city names for the active Kazakhstan catalog. The database
 * UUID/slug/name remains the search and write identity; this map must never be
 * used to infer a market, country, or city ID.
 *
 * Russian is deliberately the launch fallback. In particular, an unfamiliar
 * Kazakhstan city never falls back to a legacy Turkish display name.
 */
const KAZAKHSTAN_CITY_LABELS: Readonly<Record<string, Readonly<Record<"ru" | "kk" | "en" | "zh-CN", string>>>> = {
  Astana: { ru: "Астана", kk: "Астана", en: "Astana", "zh-CN": "阿斯塔纳" },
  Almaty: { ru: "Алматы", kk: "Алматы", en: "Almaty", "zh-CN": "阿拉木图" },
  Shymkent: { ru: "Шымкент", kk: "Шымкент", en: "Shymkent", "zh-CN": "奇姆肯特" },
  Semey: { ru: "Семей", kk: "Семей", en: "Semey", "zh-CN": "塞梅伊" },
  Kokshetau: { ru: "Кокшетау", kk: "Көкшетау", en: "Kokshetau", "zh-CN": "科克舍套" },
  Aktobe: { ru: "Актобе", kk: "Ақтөбе", en: "Aktobe", "zh-CN": "阿克托别" },
  Qonaev: { ru: "Конаев", kk: "Қонаев", en: "Qonaev", "zh-CN": "科纳耶夫" },
  Atyrau: { ru: "Атырау", kk: "Атырау", en: "Atyrau", "zh-CN": "阿特劳" },
  Oral: { ru: "Уральск", kk: "Орал", en: "Oral", "zh-CN": "乌拉尔斯克" },
  Taraz: { ru: "Тараз", kk: "Тараз", en: "Taraz", "zh-CN": "塔拉兹" },
  Taldykorgan: { ru: "Талдыкорган", kk: "Талдықорған", en: "Taldykorgan", "zh-CN": "塔尔迪库尔干" },
  Karaganda: { ru: "Караганда", kk: "Қарағанды", en: "Karaganda", "zh-CN": "卡拉干达" },
  Kostanay: { ru: "Костанай", kk: "Қостанай", en: "Kostanay", "zh-CN": "库斯塔奈" },
  Kyzylorda: { ru: "Кызылорда", kk: "Қызылорда", en: "Kyzylorda", "zh-CN": "克孜勒奥尔达" },
  Aktau: { ru: "Актау", kk: "Ақтау", en: "Aktau", "zh-CN": "阿克套" },
  Pavlodar: { ru: "Павлодар", kk: "Павлодар", en: "Pavlodar", "zh-CN": "巴甫洛达尔" },
  Petropavl: { ru: "Петропавловск", kk: "Петропавл", en: "Petropavl", "zh-CN": "彼得罗巴甫洛夫斯克" },
  Turkistan: { ru: "Туркестан", kk: "Түркістан", en: "Turkistan", "zh-CN": "突厥斯坦" },
  Zhezkazgan: { ru: "Жезказган", kk: "Жезқазған", en: "Zhezkazgan", "zh-CN": "杰兹卡兹甘" },
  Oskemen: { ru: "Усть-Каменогорск", kk: "Өскемен", en: "Oskemen", "zh-CN": "乌斯季卡缅诺戈尔斯克" }
};

export function getLocalizedCityLabel(
  value: LocationIdentifier,
  locale?: string | null,
  marketKey: MarketProfileKey | string = ACTIVE_MARKET_PROFILE_KEY
) {
  const canonical = getCityLabel(value, marketKey);
  if (marketKey !== "jolcarKazakhstan") return canonical;

  const labels = KAZAKHSTAN_CITY_LABELS[canonical] ?? KAZAKHSTAN_CITY_LABELS[value];
  const normalizedLocale = normalizeCityDisplayLocale(locale);
  if (!labels) return canonical;
  const displayLocale = normalizedLocale === "kk" || normalizedLocale === "en" || normalizedLocale === "zh-CN" ? normalizedLocale : "ru";
  return labels[displayLocale];
}

function normalizeCityDisplayLocale(locale?: string | null) {
  const normalized = locale?.trim().toLowerCase().replace("_", "-");
  if (normalized === "kk" || normalized?.startsWith("kk-")) return "kk";
  if (normalized === "en" || normalized?.startsWith("en-")) return "en";
  if (normalized === "zh-cn" || normalized === "zh-hans") return "zh-CN";
  return "ru";
}

export function getPreferredCityNames(marketKey: MarketProfileKey | string = ACTIVE_MARKET_PROFILE_KEY): readonly string[] {
  const result = getLocationDataset(marketKey);
  return result.status === "available" ? result.dataset.preferredCityNames : [];
}
