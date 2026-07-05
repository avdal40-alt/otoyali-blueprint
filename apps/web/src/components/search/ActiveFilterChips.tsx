"use client";

import type { ListingSearchFilters } from "@/lib/search/search-params";
import { selectedValues } from "@/lib/search/search-params";
import { bodyTypeLabel, cityLabel, colorLabel, conditionLabel, damageStateLabel, driveTypeLabel, fuelLabel, sellerTypeLabel, transmissionLabel } from "@/lib/format";

const labels: Partial<Record<keyof ListingSearchFilters, string>> = {
  q: "Arama",
  make: "Marka",
  model: "Model",
  city: "Şehir",
  priceMin: "Fiyat min",
  priceMax: "Fiyat max",
  yearMin: "Yıl min",
  yearMax: "Yıl max",
  mileageMax: "Km max",
  fuelType: "Yakıt",
  transmission: "Vites",
  bodyType: "Kasa",
  driveType: "Çekiş",
  color: "Renk",
  condition: "Durum",
  sellerType: "Satıcı tipi",
  engineVolume: "Motor hacmi",
  damageState: "Hasar durumu",
  ownerCount: "Sahip sayısı",
  onlyWithPhotos: "Fotoğraflı",
  negotiableOnly: "Pazarlık",
  promotedOnly: "Öne çıkan",
  tradeOnly: "Takas",
  advanced: "Gelişmiş"
};

export function ActiveFilterChips({
  filters,
  onRemove,
  onReset
}: {
  filters: ListingSearchFilters;
  onRemove: (key: keyof ListingSearchFilters) => void;
  onReset: () => void;
}) {
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
          {labels[key]}{typeof value === "string" && value ? `: ${formatChipValue(key, value)}` : ""} ×
        </button>
      ))}
      <button type="button" onClick={onReset} className="px-2 py-1.5 text-xs font-bold text-oto-blue">
        Filtreleri temizle
      </button>
    </div>
  );
}

function formatChipValue(key: keyof ListingSearchFilters, value: string) {
  const values = selectedValues(value);
  if (values.length > 1) {
    return values.map((item) => formatSingleValue(key, item)).join(", ");
  }

  return formatSingleValue(key, value);
}

function formatSingleValue(key: keyof ListingSearchFilters, value: string) {
  if (key === "city") return cityLabel(value);
  if (key === "fuelType") return fuelLabel(value);
  if (key === "transmission") return transmissionLabel(value);
  if (key === "bodyType") return bodyTypeLabel(value);
  if (key === "driveType") return driveTypeLabel(value);
  if (key === "color") return colorLabel(value);
  if (key === "condition") return conditionLabel(value);
  if (key === "sellerType") return sellerTypeLabel(value);
  if (key === "damageState") return damageStateLabel(value);
  return value;
}
