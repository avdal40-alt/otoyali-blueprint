"use client";

import type { ListingSearchFilters } from "@/lib/search/search-params";

const labels: Partial<Record<keyof ListingSearchFilters, string>> = {
  q: "Arama",
  make: "Marka",
  model: "Model",
  city: "Sehir",
  priceMin: "Fiyat min",
  priceMax: "Fiyat max",
  yearMin: "Yil min",
  yearMax: "Yil max",
  mileageMax: "Km max",
  fuelType: "Yakit",
  transmission: "Vites",
  bodyType: "Kasa",
  driveType: "Cekis",
  color: "Renk",
  condition: "Durum",
  sellerType: "Satici tipi",
  onlyWithPhotos: "Fotografli",
  negotiableOnly: "Pazarlik",
  promotedOnly: "One cikan",
  tradeOnly: "Takas",
  advanced: "Gelismis"
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
          {labels[key]}{typeof value === "string" && value ? `: ${value}` : ""} x
        </button>
      ))}
      <button type="button" onClick={onReset} className="px-2 py-1.5 text-xs font-bold text-oto-blue">
        Filtreleri temizle
      </button>
    </div>
  );
}
