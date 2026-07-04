"use client";

import type { Make, Model } from "@/lib/supabase/types";
import type { ListingSearchFilters } from "@/lib/search/search-params";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";

export const fuelOptions = [
  { value: "gasoline", label: "Benzin" },
  { value: "diesel", label: "Dizel" },
  { value: "lpg", label: "LPG" },
  { value: "electric", label: "Elektrik" },
  { value: "hybrid", label: "Hibrit" }
];

export const transmissionOptions = [
  { value: "manual", label: "Manuel" },
  { value: "automatic", label: "Otomatik" }
];

export function SearchFilters({
  filters,
  makes,
  models,
  cities,
  showAdvanced,
  support,
  onChange,
  onSubmit,
  onReset
}: {
  filters: ListingSearchFilters;
  makes: Make[];
  models: Model[];
  cities: string[];
  showAdvanced: boolean;
  support: {
    photos: boolean;
    priceNegotiable: boolean;
    promoted: boolean;
  };
  onChange: (filters: ListingSearchFilters) => void;
  onSubmit?: () => void;
  onReset?: () => void;
}) {
  const filteredModels = filters.make ? models.filter((model) => (model.make_name ?? "") === filters.make) : models;

  function setValue<K extends keyof ListingSearchFilters>(key: K, value: ListingSearchFilters[K]) {
    onChange({
      ...filters,
      [key]: value,
      ...(key === "make" ? { model: "" } : {})
    });
  }

  return (
    <div className="rounded-oto border border-oto-border bg-white p-4 shadow-soft">
      <div className="grid gap-3">
        <Input value={filters.q} onChange={(event) => setValue("q", event.target.value)} placeholder="Arama" />
        <Select value={filters.make} onChange={(event) => setValue("make", event.target.value)}>
          <option value="">Tüm markalar</option>
          {makes.map((make) => (
            <option key={make.make_id} value={make.make_name ?? ""}>
              {make.make_name ?? "Bilgi yok"}
            </option>
          ))}
        </Select>
        <Select value={filters.model} onChange={(event) => setValue("model", event.target.value)}>
          <option value="">Tüm modeller</option>
          {filteredModels.map((model) => (
            <option key={model.model_id} value={model.model_name ?? ""}>
              {model.model_name ?? "Bilgi yok"}
            </option>
          ))}
        </Select>
        <Select value={filters.city} onChange={(event) => setValue("city", event.target.value)}>
          <option value="">Tüm şehirler</option>
          {cities.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-2">
          <Input value={filters.priceMin} onChange={(event) => setValue("priceMin", event.target.value)} placeholder="Fiyat en az" inputMode="numeric" />
          <Input value={filters.priceMax} onChange={(event) => setValue("priceMax", event.target.value)} placeholder="Fiyat en fazla" inputMode="numeric" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input value={filters.yearMin} onChange={(event) => setValue("yearMin", event.target.value)} placeholder="Yıl en az" inputMode="numeric" />
          <Input value={filters.yearMax} onChange={(event) => setValue("yearMax", event.target.value)} placeholder="Yıl en fazla" inputMode="numeric" />
        </div>
        <Input value={filters.mileageMax} onChange={(event) => setValue("mileageMax", event.target.value)} placeholder="Kilometre en fazla" inputMode="numeric" />

        {showAdvanced ? (
          <>
            <Select value={filters.fuelType} onChange={(event) => setValue("fuelType", event.target.value)}>
              <option value="">Yakıt</option>
              {fuelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select value={filters.transmission} onChange={(event) => setValue("transmission", event.target.value)}>
              <option value="">Vites</option>
              {transmissionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            {support.photos ? (
              <label className="flex items-center gap-2 text-sm font-semibold text-oto-muted">
                <input type="checkbox" checked={filters.onlyWithPhotos} onChange={(event) => setValue("onlyWithPhotos", event.target.checked)} />
                Sadece fotoğraflı ilanlar
              </label>
            ) : null}
            {support.priceNegotiable ? (
              <label className="flex items-center gap-2 text-sm font-semibold text-oto-muted">
                <input type="checkbox" checked={filters.negotiableOnly} onChange={(event) => setValue("negotiableOnly", event.target.checked)} />
                Pazarlık var
              </label>
            ) : null}
            {support.promoted ? (
              <label className="flex items-center gap-2 text-sm font-semibold text-oto-muted">
                <input type="checkbox" checked={filters.promotedOnly} onChange={(event) => setValue("promotedOnly", event.target.checked)} />
                Öne çıkan ilanlar
              </label>
            ) : null}
          </>
        ) : null}

        <div className="grid grid-cols-2 gap-2 pt-1">
          {onReset ? (
            <Button type="button" variant="secondary" onClick={onReset}>
              Temizle
            </Button>
          ) : null}
          <Button type="button" variant="orange" onClick={onSubmit} className={onReset ? "" : "col-span-2"}>
            Ara
          </Button>
        </div>
      </div>
    </div>
  );
}
