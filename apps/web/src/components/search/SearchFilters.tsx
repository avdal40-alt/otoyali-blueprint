"use client";

import { useMemo, useState } from "react";
import type { Make, Model } from "@/lib/supabase/types";
import type { ListingSearchFilters } from "@/lib/search/search-params";
import { selectedValues, toggleSelectedValue } from "@/lib/search/search-params";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { bodyTypeLabel, cityLabel, colorLabel, conditionLabel, damageStateLabel, driveTypeLabel, fuelLabel, sellerTypeLabel, transmissionLabel } from "@/lib/format";
import { useI18n } from "@/i18n/client";

export const fuelOptions = [
  { value: "gasoline", label: fuelLabel("gasoline") },
  { value: "diesel", label: fuelLabel("diesel") },
  { value: "hybrid", label: fuelLabel("hybrid") },
  { value: "electric", label: fuelLabel("electric") },
  { value: "lpg", label: fuelLabel("lpg") },
  { value: "other", label: fuelLabel("other") }
];

export const transmissionOptions = [
  { value: "automatic", label: transmissionLabel("automatic") },
  { value: "manual", label: transmissionLabel("manual") },
  { value: "semi_automatic", label: transmissionLabel("semi_automatic") }
];

const bodyTypeOptions = [
  { value: "sedan", label: bodyTypeLabel("sedan") },
  { value: "hatchback", label: bodyTypeLabel("hatchback") },
  { value: "suv", label: bodyTypeLabel("suv") },
  { value: "coupe", label: bodyTypeLabel("coupe") },
  { value: "wagon", label: bodyTypeLabel("wagon") },
  { value: "pickup", label: bodyTypeLabel("pickup") },
  { value: "minivan", label: bodyTypeLabel("minivan") },
  { value: "commercial", label: bodyTypeLabel("commercial") },
  { value: "other", label: bodyTypeLabel("other") }
];

const driveTypeOptions = [
  { value: "", label: "Tüm çekiş tipleri" },
  { value: "front", label: driveTypeLabel("front") },
  { value: "rear", label: driveTypeLabel("rear") },
  { value: "4x4", label: driveTypeLabel("4x4") },
  { value: "awd", label: driveTypeLabel("awd") }
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
  { value: "unknown", label: "Belirtilmemiş" },
  { value: "none", label: damageStateLabel("none") },
  { value: "painted", label: damageStateLabel("painted") },
  { value: "replaced", label: damageStateLabel("replaced") },
  { value: "heavy_damage", label: damageStateLabel("heavy_damage") },
  { value: "minor", label: damageStateLabel("minor") },
  { value: "major", label: damageStateLabel("major") }
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
  const { locale, dictionary } = useI18n();
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
  const localizedFuelOptions = fuelOptions.map((option) => ({ ...option, label: fuelLabel(option.value, locale) }));
  const localizedTransmissionOptions = transmissionOptions.map((option) => ({ ...option, label: transmissionLabel(option.value, locale) }));
  const localizedBodyTypeOptions = bodyTypeOptions.map((option) => ({ ...option, label: bodyTypeLabel(option.value, locale) }));
  const localizedDriveTypeOptions = [
    { value: "", label: String(dictionary.search.allDriveTypes) },
    { value: "front", label: driveTypeLabel("front", locale) },
    { value: "rear", label: driveTypeLabel("rear", locale) },
    { value: "4x4", label: driveTypeLabel("4x4", locale) },
    { value: "awd", label: driveTypeLabel("awd", locale) }
  ];
  const localizedColorOptions = [
    { value: "", label: String(dictionary.search.allColors) },
    { value: "white", label: colorLabel("white", locale) },
    { value: "black", label: colorLabel("black", locale) },
    { value: "gray", label: colorLabel("gray", locale) },
    { value: "blue", label: colorLabel("blue", locale) },
    { value: "red", label: colorLabel("red", locale) }
  ];
  const localizedDamageOptions = damageOptions.map((option) => ({
    ...option,
    label: option.value ? damageStateLabel(option.value, locale) : locale === "en" ? "All damage statuses" : "Tüm hasar durumları"
  }));

  return (
    <div className="rounded-oto border border-oto-border bg-white p-4 shadow-soft">
      <div className="grid gap-4">
        <Input value={filters.q} onChange={(event) => setValue("q", event.target.value)} placeholder={String(dictionary.common.search)} />

        <MultiSelectGroup
          label={String(dictionary.search.brand)}
          values={selectedValues(filters.make)}
          options={makes.map((make) => ({ value: make.make_name ?? "", label: make.make_name ?? String(dictionary.common.noInfo) }))}
          onToggle={(value) => toggleValue("make", value)}
          emptyLabel={String(dictionary.search.allBrands)}
          searchable
        />

        <MultiSelectGroup
          label={String(dictionary.search.model)}
          values={selectedValues(filters.model)}
          options={filteredModels.map((model) => ({ value: model.model_name ?? "", label: model.model_name ?? String(dictionary.common.noInfo) }))}
          onToggle={(value) => toggleValue("model", value)}
          emptyLabel={String(dictionary.search.allModels)}
          searchable
        />

        <MultiSelectGroup
          label={String(dictionary.search.city)}
          values={selectedValues(filters.city)}
          options={cities.map((city) => ({ value: city, label: cityLabel(city, locale) }))}
          onToggle={(value) => toggleValue("city", value)}
          emptyLabel={String(dictionary.search.allCities)}
          searchable
        />

        <div className="grid grid-cols-2 gap-2">
          <Input value={filters.priceMin} onChange={(event) => setValue("priceMin", event.target.value)} placeholder={String(dictionary.search.priceMin)} inputMode="numeric" />
          <Input value={filters.priceMax} onChange={(event) => setValue("priceMax", event.target.value)} placeholder={String(dictionary.search.priceMax)} inputMode="numeric" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input value={filters.yearMin} onChange={(event) => setValue("yearMin", event.target.value)} placeholder={String(dictionary.search.yearMin)} inputMode="numeric" />
          <Input value={filters.yearMax} onChange={(event) => setValue("yearMax", event.target.value)} placeholder={String(dictionary.search.yearMax)} inputMode="numeric" />
        </div>
        <Input value={filters.mileageMax} onChange={(event) => setValue("mileageMax", event.target.value)} placeholder={String(dictionary.search.mileageMax)} inputMode="numeric" />

        {showAdvanced ? (
          <div className="grid gap-4 border-t border-oto-border pt-4">
            <MultiSelectGroup
              label={String(dictionary.search.fuelType)}
              values={selectedValues(filters.fuelType)}
              options={localizedFuelOptions}
              onToggle={(value) => toggleValue("fuelType", value)}
              emptyLabel={String(dictionary.search.allFuelTypes)}
            />

            <MultiSelectGroup
              label={String(dictionary.search.transmission)}
              values={selectedValues(filters.transmission)}
              options={localizedTransmissionOptions}
              onToggle={(value) => toggleValue("transmission", value)}
              emptyLabel={String(dictionary.search.allTransmissions)}
            />

            <MultiSelectGroup
              label={String(dictionary.search.bodyType)}
              values={selectedValues(filters.bodyType)}
              options={localizedBodyTypeOptions}
              onToggle={(value) => toggleValue("bodyType", value)}
              emptyLabel={String(dictionary.search.allBodyTypes)}
              disabled={!support.bodyType}
            />

            <Select value={filters.driveType} onChange={(event) => setValue("driveType", event.target.value)} disabled={!support.driveType}>
              {localizedDriveTypeOptions.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}
            </Select>

            <Select value={filters.color} onChange={(event) => setValue("color", event.target.value)} disabled={!support.color}>
              {localizedColorOptions.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}
            </Select>

            <Select value={filters.condition} onChange={(event) => setValue("condition", event.target.value)} disabled={!support.condition}>
              <option value="">{String(dictionary.home.allListings)}</option>
              <option value="used">{conditionLabel("used", locale)}</option>
              <option value="new">{conditionLabel("new", locale)}</option>
            </Select>

            <Select value={filters.sellerType} onChange={(event) => setValue("sellerType", event.target.value)} disabled={!support.sellerType}>
              <option value="">{String(dictionary.search.allSellerTypes)}</option>
              <option value="private">{sellerTypeLabel("private", locale)}</option>
              <option value="dealer">{sellerTypeLabel("dealer", locale)}</option>
            </Select>

            <div className="grid grid-cols-2 gap-2">
              <Input value={filters.engineVolume} onChange={(event) => setValue("engineVolume", event.target.value)} placeholder={locale === "en" ? "Engine volume" : "Motor hacmi"} inputMode="decimal" disabled={!support.engineVolume} />
              <Input value={filters.ownerCount} onChange={(event) => setValue("ownerCount", event.target.value)} placeholder={locale === "en" ? "Owner count" : "Sahip sayısı"} inputMode="numeric" disabled={!support.ownerCount} />
            </div>

            <Select value={filters.damageState} onChange={(event) => setValue("damageState", event.target.value)} disabled={!support.damageState}>
              {localizedDamageOptions.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}
            </Select>

            {support.photos ? (
              <label className="flex items-center gap-2 text-sm font-semibold text-oto-muted">
                <input type="checkbox" checked={filters.onlyWithPhotos} onChange={(event) => setValue("onlyWithPhotos", event.target.checked)} />
                {String(dictionary.search.withPhotos)}
              </label>
            ) : null}
            {support.priceNegotiable ? (
              <label className="flex items-center gap-2 text-sm font-semibold text-oto-muted">
                <input type="checkbox" checked={filters.negotiableOnly} onChange={(event) => setValue("negotiableOnly", event.target.checked)} />
                {locale === "en" ? "Negotiable" : "Pazarlık var"}
              </label>
            ) : null}
            {support.promoted ? (
              <label className="flex items-center gap-2 text-sm font-semibold text-oto-muted">
                <input type="checkbox" checked={filters.promotedOnly} onChange={(event) => setValue("promotedOnly", event.target.checked)} />
                {String(dictionary.home.hotTitle)}
              </label>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2 pt-1">
          {onReset ? (
            <Button type="button" variant="secondary" onClick={onReset}>
              {String(dictionary.common.clear)}
            </Button>
          ) : null}
          <Button type="button" variant="orange" onClick={onSubmit} className={onReset ? "" : "col-span-2"}>
            {String(dictionary.common.search)}
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
  disabled = false,
  searchable = false
}: {
  label: string;
  values: string[];
  options: Array<{ value: string; label: string }>;
  onToggle: (value: string) => void;
  emptyLabel: string;
  disabled?: boolean;
  searchable?: boolean;
}) {
  const { locale } = useI18n();
  const cleanOptions = useMemo(() => options.filter((option) => option.value), [options]);
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeOption(query);
  const selectedOptions = useMemo(
    () => values
      .map((value) => cleanOptions.find((option) => option.value === value) ?? { value, label: value })
      .filter((option) => option.value),
    [cleanOptions, values]
  );
  const filteredOptions = useMemo(
    () =>
      searchable
        ? cleanOptions.filter((option) => !normalizedQuery || normalizeOption(option.label).includes(normalizedQuery) || normalizeOption(option.value).includes(normalizedQuery))
        : cleanOptions,
    [cleanOptions, normalizedQuery, searchable]
  );
  const visibleOptions = searchable ? mergeOptions(selectedOptions, filteredOptions).slice(0, 16) : cleanOptions;

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-oto-muted">{label}</span>
        <span className="text-[11px] font-bold text-oto-muted">{values.length > 0 ? (locale === "en" ? `${values.length} selected` : `${values.length} seçili`) : emptyLabel}</span>
      </div>
      {searchable ? (
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={locale === "en" ? `Search ${label.toLowerCase()}` : `${label} ara`}
          disabled={disabled || cleanOptions.length === 0}
          className="h-10"
        />
      ) : null}
      <div className="flex flex-wrap gap-2">
        {visibleOptions.map((option) => {
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
        {visibleOptions.length === 0 ? <p className="text-xs font-semibold text-oto-muted">{locale === "en" ? "No results found." : "Sonuç bulunamadı."}</p> : null}
      </div>
    </div>
  );
}

function normalizeOption(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function mergeOptions(
  selectedOptions: Array<{ value: string; label: string }>,
  filteredOptions: Array<{ value: string; label: string }>
) {
  const seen = new Set<string>();
  return [...selectedOptions, ...filteredOptions].filter((option) => {
    if (seen.has(option.value)) return false;
    seen.add(option.value);
    return true;
  });
}
