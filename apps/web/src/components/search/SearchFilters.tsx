"use client";

import type { Make, Model } from "@/lib/supabase/types";
import type { ListingSearchFilters } from "@/lib/search/search-params";
import { selectedValues, toggleSelectedValue } from "@/lib/search/search-params";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { bodyTypeLabel, cityLabel } from "@/lib/format";

export const fuelOptions = [
  { value: "gasoline", label: "Benzin" },
  { value: "diesel", label: "Dizel" },
  { value: "lpg", label: "LPG" },
  { value: "electric", label: "Elektrikli" },
  { value: "hybrid", label: "Hibrit" }
];

export const transmissionOptions = [
  { value: "manual", label: "Manuel" },
  { value: "automatic", label: "Otomatik" }
];

const bodyTypeOptions = [
  { value: "sedan", label: "Sedan" },
  { value: "hatchback", label: "Hatchback" },
  { value: "suv", label: "SUV" },
  { value: "wagon", label: "Station wagon" },
  { value: "coupe", label: "Coupe" }
];

const driveTypeOptions = [
  { value: "", label: "Tüm çekiş tipleri" },
  { value: "front", label: "Önden çekiş" },
  { value: "rear", label: "Arkadan itiş" },
  { value: "awd", label: "4x4 / AWD" }
];

const colorOptions = [
  { value: "", label: "Tüm renkler" },
  { value: "white", label: "Beyaz" },
  { value: "black", label: "Siyah" },
  { value: "gray", label: "Gri" },
  { value: "blue", label: "Mavi" },
  { value: "red", label: "Kırmızı" }
];

const damageOptions = [
  { value: "", label: "Tüm hasar durumları" },
  { value: "unknown", label: "Bilinmiyor" },
  { value: "none", label: "Hasarsız" },
  { value: "minor", label: "Hafif hasarlı" },
  { value: "major", label: "Ağır hasarlı" }
];

type FilterSupport = {
  photos: boolean;
  priceNegotiable: boolean;
  promoted: boolean;
  bodyType: boolean;
  condition: boolean;
  sellerType: boolean;
  driveType: boolean;
  color: boolean;
  engineVolume: boolean;
  damageState: boolean;
  ownerCount: boolean;
};

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
  support: FilterSupport;
  onChange: (filters: ListingSearchFilters) => void;
  onSubmit?: () => void;
  onReset?: () => void;
}) {
  const selectedMakes = selectedValues(filters.make);
  const filteredModels = selectedMakes.length > 0
    ? models.filter((model) => selectedMakes.includes(model.make_name ?? ""))
    : models;

  function setValue<K extends keyof ListingSearchFilters>(key: K, value: ListingSearchFilters[K]) {
    onChange({
      ...filters,
      [key]: value,
      ...(key === "make" ? { model: "" } : {})
    });
  }

  function toggleValue(key: "make" | "model" | "city" | "fuelType" | "transmission" | "bodyType", value: string) {
    setValue(key, toggleSelectedValue(filters[key], value));
  }

  return (
    <div className="rounded-oto border border-oto-border bg-white p-4 shadow-soft">
      <div className="grid gap-4">
        <Input value={filters.q} onChange={(event) => setValue("q", event.target.value)} placeholder="Arama" />

        <MultiSelectGroup
          label="Marka"
          values={selectedValues(filters.make)}
          options={makes.map((make) => ({ value: make.make_name ?? "", label: make.make_name ?? "Bilgi yok" }))}
          onToggle={(value) => toggleValue("make", value)}
          emptyLabel="Tüm markalar"
        />

        <MultiSelectGroup
          label="Model"
          values={selectedValues(filters.model)}
          options={filteredModels.map((model) => ({ value: model.model_name ?? "", label: model.model_name ?? "Bilgi yok" }))}
          onToggle={(value) => toggleValue("model", value)}
          emptyLabel="Tüm modeller"
        />

        <MultiSelectGroup
          label="Şehir"
          values={selectedValues(filters.city)}
          options={cities.map((city) => ({ value: city, label: cityLabel(city) }))}
          onToggle={(value) => toggleValue("city", value)}
          emptyLabel="Tüm şehirler"
        />

        <div className="grid grid-cols-2 gap-2">
          <Input value={filters.priceMin} onChange={(event) => setValue("priceMin", event.target.value)} placeholder="Fiyat min" inputMode="numeric" />
          <Input value={filters.priceMax} onChange={(event) => setValue("priceMax", event.target.value)} placeholder="Fiyat max" inputMode="numeric" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input value={filters.yearMin} onChange={(event) => setValue("yearMin", event.target.value)} placeholder="Yıl min" inputMode="numeric" />
          <Input value={filters.yearMax} onChange={(event) => setValue("yearMax", event.target.value)} placeholder="Yıl max" inputMode="numeric" />
        </div>
        <Input value={filters.mileageMax} onChange={(event) => setValue("mileageMax", event.target.value)} placeholder="Kilometre max" inputMode="numeric" />

        {showAdvanced ? (
          <div className="grid gap-4 border-t border-oto-border pt-4">
            <MultiSelectGroup
              label="Yakıt tipi"
              values={selectedValues(filters.fuelType)}
              options={fuelOptions}
              onToggle={(value) => toggleValue("fuelType", value)}
              emptyLabel="Tüm yakıt tipleri"
            />

            <MultiSelectGroup
              label="Vites"
              values={selectedValues(filters.transmission)}
              options={transmissionOptions}
              onToggle={(value) => toggleValue("transmission", value)}
              emptyLabel="Tüm vitesler"
            />

            <MultiSelectGroup
              label="Kasa tipi"
              values={selectedValues(filters.bodyType)}
              options={bodyTypeOptions.map((option) => ({ ...option, label: bodyTypeLabel(option.value) }))}
              onToggle={(value) => toggleValue("bodyType", value)}
              emptyLabel="Tüm kasa tipleri"
              disabled={!support.bodyType}
            />

            <Select value={filters.driveType} onChange={(event) => setValue("driveType", event.target.value)} disabled={!support.driveType}>
              {driveTypeOptions.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}
            </Select>

            <Select value={filters.color} onChange={(event) => setValue("color", event.target.value)} disabled={!support.color}>
              {colorOptions.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}
            </Select>

            <Select value={filters.condition} onChange={(event) => setValue("condition", event.target.value)} disabled={!support.condition}>
              <option value="">Tüm ilanlar</option>
              <option value="used">İkinci el</option>
              <option value="new">Sıfır km</option>
            </Select>

            <Select value={filters.sellerType} onChange={(event) => setValue("sellerType", event.target.value)} disabled={!support.sellerType}>
              <option value="">Tümü</option>
              <option value="private">Bireysel</option>
              <option value="dealer">Galeri</option>
            </Select>

            <div className="grid grid-cols-2 gap-2">
              <Input value={filters.engineVolume} onChange={(event) => setValue("engineVolume", event.target.value)} placeholder="Motor hacmi" inputMode="decimal" disabled={!support.engineVolume} />
              <Input value={filters.ownerCount} onChange={(event) => setValue("ownerCount", event.target.value)} placeholder="Sahip sayısı" inputMode="numeric" disabled={!support.ownerCount} />
            </div>

            <Select value={filters.damageState} onChange={(event) => setValue("damageState", event.target.value)} disabled={!support.damageState}>
              {damageOptions.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}
            </Select>

            {support.photos ? (
              <label className="flex items-center gap-2 text-sm font-semibold text-oto-muted">
                <input type="checkbox" checked={filters.onlyWithPhotos} onChange={(event) => setValue("onlyWithPhotos", event.target.checked)} />
                Fotoğraflı ilanlar
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
          </div>
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

function MultiSelectGroup({
  label,
  values,
  options,
  onToggle,
  emptyLabel,
  disabled = false
}: {
  label: string;
  values: string[];
  options: Array<{ value: string; label: string }>;
  onToggle: (value: string) => void;
  emptyLabel: string;
  disabled?: boolean;
}) {
  const cleanOptions = options.filter((option) => option.value);
  const limited = cleanOptions.slice(0, 8);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-oto-muted">{label}</span>
        <span className="text-[11px] font-bold text-oto-muted">{values.length > 0 ? `${values.length} seçili` : emptyLabel}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {limited.map((option) => {
          const active = values.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onToggle(option.value)}
              className={
                active
                  ? "rounded-full bg-oto-blue px-3 py-1.5 text-xs font-black text-white disabled:opacity-40"
                  : "rounded-full border border-oto-border bg-white px-3 py-1.5 text-xs font-bold text-oto-muted transition hover:border-oto-blue hover:text-oto-text disabled:opacity-40"
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
