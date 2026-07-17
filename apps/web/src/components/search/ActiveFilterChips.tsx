"use client";

import type { ListingSearchFilters } from "@/lib/search/search-params";
import { selectedValues } from "@/lib/search/search-params";
import { bodyTypeLabel, cityLabel, colorLabel, conditionLabel, damageStateLabel, driveTypeLabel, fuelLabel, sellerTypeLabel, transmissionLabel } from "@/lib/format";
import { useI18n } from "@/i18n/client";

export function ActiveFilterChips({
  filters,
  onRemove,
  onReset
}: {
  filters: ListingSearchFilters;
  onRemove: (key: keyof ListingSearchFilters) => void;
  onReset: () => void;
}) {
  const { locale, dictionary } = useI18n();
  const labels: Partial<Record<keyof ListingSearchFilters, string>> = {
    q: String(dictionary.common.search),
    make: String(dictionary.search.brand),
    model: String(dictionary.search.model),
    city: String(dictionary.search.city),
    priceMin: String(dictionary.search.priceMin),
    priceMax: String(dictionary.search.priceMax),
    yearMin: String(dictionary.search.yearMin),
    yearMax: String(dictionary.search.yearMax),
    mileageMax: locale === "en" ? "Max km" : "Km max",
    fuelType: String(dictionary.search.fuelType),
    transmission: String(dictionary.search.transmission),
    bodyType: String(dictionary.search.bodyType),
    driveType: String(dictionary.search.driveType),
    color: String(dictionary.search.color),
    condition: String(dictionary.search.condition),
    sellerType: String(dictionary.search.sellerType),
    engineVolume: locale === "en" ? "Engine volume" : "Motor hacmi",
    damageState: locale === "en" ? "Damage status" : "Hasar durumu",
    ownerCount: locale === "en" ? "Owner count" : "Sahip sayısı",
    onlyWithPhotos: String(dictionary.search.withPhotos),
    negotiableOnly: locale === "en" ? "Negotiable" : "Pazarlık",
    promotedOnly: String(dictionary.home.hotTitle),
    tradeOnly: String(dictionary.search.trade),
    advanced: String(dictionary.search.advanced)
  };
  const chips = Object.entries(filters).filter(([key, value]) => {
    if (key === "sort") return false;
    return typeof value === "boolean" ? value : Boolean(value);
  }) as Array<[keyof ListingSearchFilters, string | boolean]>;

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {chips.map(([key, value]) => (
        <button
          key={key}
          type="button"
          onClick={() => onRemove(key)}
          className="rounded-full border border-oto-border bg-white px-3 py-1.5 text-xs font-bold text-oto-muted transition hover:border-oto-blue hover:text-oto-text"
        >
          {labels[key]}{typeof value === "string" && value ? `: ${formatChipValue(key, value, locale)}` : ""} ×
        </button>
      ))}
      <button type="button" onClick={onReset} className="px-2 py-1.5 text-xs font-bold text-oto-blue">
        {locale === "en" ? "Clear filters" : "Filtreleri temizle"}
      </button>
    </div>
  );
}

function formatChipValue(key: keyof ListingSearchFilters, value: string, locale: "tr" | "en") {
  const values = selectedValues(value);
  if (values.length > 1) {
    return values.map((item) => formatSingleValue(key, item, locale)).join(", ");
  }

  return formatSingleValue(key, value, locale);
}

function formatSingleValue(key: keyof ListingSearchFilters, value: string, locale: "tr" | "en") {
  if (key === "city") return cityLabel(value, locale);
  if (key === "fuelType") return fuelLabel(value, locale);
  if (key === "transmission") return transmissionLabel(value, locale);
  if (key === "bodyType") return bodyTypeLabel(value, locale);
  if (key === "driveType") return driveTypeLabel(value, locale);
  if (key === "color") return colorLabel(value, locale);
  if (key === "condition") return conditionLabel(value, locale);
  if (key === "sellerType") return sellerTypeLabel(value, locale);
  if (key === "damageState") return damageStateLabel(value, locale);
  return value;
}
