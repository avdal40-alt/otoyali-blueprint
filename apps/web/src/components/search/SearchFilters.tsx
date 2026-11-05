"use client";

import { useMemo, useState } from "react";
import type { Make, Model } from "@/lib/supabase/types";
import type { ListingSearchFilters } from "@/lib/search/search-params";
import { selectedValues, toggleSelectedValue } from "@/lib/search/search-params";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { bodyTypeLabel, cityLabel, colorLabel, conditionLabel, damageStateLabel, driveTypeLabel, fuelLabel, sellerTypeLabel, transmissionLabel } from "@/lib/format";
import { getIntlLocale } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/types";
import { listingPurposes, vehicleCategories, vehicleCategoryLabel, vehicleMarketplaceV2Copy, listingPurposeLabel } from "@/lib/marketplace/v2-contract";

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

const damageOptions = [
  { value: "" },
  { value: "unknown" },
  { value: "none" },
  { value: "painted" },
  { value: "replaced" },
  { value: "heavy_damage" },
  { value: "minor" },
  { value: "major" }
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
  trade: boolean;
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
  onReset,
  resultCount
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
  resultCount?: number;
}) {
  const { locale, dictionary } = useI18n();
  const filterControls = dictionary.search.filterControls as Record<string, string>;
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

  function toggleValue(key: "make" | "model" | "city" | "fuelType" | "transmission" | "bodyType" | "vehicleCategory" | "listingPurpose", value: string) {
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
    label: option.value ? damageStateLabel(option.value, locale) : filterControls.allDamageStates
  }));

  return (
    <div className="rounded-oto border border-oto-border bg-white p-4 shadow-soft">
      <div className="grid gap-4">
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

        <div className="grid grid-cols-2 gap-2">
          <Input value={filters.priceMin} onChange={(event) => setValue("priceMin", event.target.value)} placeholder={String(dictionary.search.priceMin)} inputMode="numeric" />
          <Input value={filters.priceMax} onChange={(event) => setValue("priceMax", event.target.value)} placeholder={String(dictionary.search.priceMax)} inputMode="numeric" />
        </div>

        {showAdvanced ? (
          <div className="grid gap-4 border-t border-oto-border pt-4">
            <MultiSelectGroup
              label={vehicleMarketplaceV2Copy("vehicleCategory", locale)}
              values={selectedValues(filters.vehicleCategory)}
              options={vehicleCategories.map((value) => ({ value, label: vehicleCategoryLabel(value, locale) }))}
              onToggle={(value) => toggleValue("vehicleCategory", value)}
              emptyLabel={vehicleMarketplaceV2Copy("allCategories", locale)}
            />

            <MultiSelectGroup
              label={vehicleMarketplaceV2Copy("listingPurpose", locale)}
              values={selectedValues(filters.listingPurpose)}
              options={listingPurposes.map((value) => ({ value, label: listingPurposeLabel(value, locale) }))}
              onToggle={(value) => toggleValue("listingPurpose", value)}
              emptyLabel={vehicleMarketplaceV2Copy("allPurposes", locale)}
            />
            <Input value={filters.q} onChange={(event) => setValue("q", event.target.value)} placeholder={String(dictionary.common.search)} />

            <MultiSelectGroup
              label={String(dictionary.search.city)}
              values={selectedValues(filters.city)}
              options={cities.map((city) => ({ value: city, label: cityLabel(city, locale) }))}
              onToggle={(value) => toggleValue("city", value)}
              emptyLabel={String(dictionary.search.allCities)}
              searchable
            />

            <div className="grid grid-cols-2 gap-2">
              <Input value={filters.yearMin} onChange={(event) => setValue("yearMin", event.target.value)} placeholder={String(dictionary.search.yearMin)} inputMode="numeric" />
              <Input value={filters.yearMax} onChange={(event) => setValue("yearMax", event.target.value)} placeholder={String(dictionary.search.yearMax)} inputMode="numeric" />
            </div>
            {selectedValues(filters.listingPurpose).includes("rent") ? <>
              <div className="grid grid-cols-2 gap-2">
                <Input value={filters.rentalPriceDayMin} onChange={(event) => setValue("rentalPriceDayMin", event.target.value)} placeholder={vehicleMarketplaceV2Copy("dailyPriceFrom", locale)} inputMode="numeric" />
                <Input value={filters.rentalPriceDayMax} onChange={(event) => setValue("rentalPriceDayMax", event.target.value)} placeholder={vehicleMarketplaceV2Copy("dailyPriceTo", locale)} inputMode="numeric" />
              </div>
              <Input value={filters.minimumRentalDays} onChange={(event) => setValue("minimumRentalDays", event.target.value)} placeholder={vehicleMarketplaceV2Copy("minimumRentalDays", locale)} inputMode="numeric" />
              <label className="flex items-center gap-2 text-sm font-semibold text-oto-muted">
                <input type="checkbox" checked={filters.withDriverOrOperator} onChange={(event) => setValue("withDriverOrOperator", event.target.checked)} />
                {vehicleMarketplaceV2Copy("withDriver", locale)}
              </label>
            </> : null}
            <div className="grid grid-cols-2 gap-2">
              <Input value={filters.mileageMin} onChange={(event) => setValue("mileageMin", event.target.value)} placeholder={String(dictionary.search.mileageMin)} inputMode="numeric" />
              <Input value={filters.mileageMax} onChange={(event) => setValue("mileageMax", event.target.value)} placeholder={String(dictionary.search.mileageMax)} inputMode="numeric" />
            </div>

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
              <Input value={filters.engineVolume} onChange={(event) => setValue("engineVolume", event.target.value)} placeholder={filterControls.engineVolume} inputMode="decimal" disabled={!support.engineVolume} />
              <Input value={filters.ownerCount} onChange={(event) => setValue("ownerCount", event.target.value)} placeholder={filterControls.ownerCount} inputMode="numeric" disabled={!support.ownerCount} />
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
                {filterControls.negotiable}
              </label>
            ) : null}
            {support.trade ? (
              <label className="flex items-center gap-2 text-sm font-semibold text-oto-muted">
                <input type="checkbox" checked={filters.tradeOnly} onChange={(event) => setValue("tradeOnly", event.target.checked)} />
                {String(dictionary.search.trade)}
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
            {resultCount === undefined ? String(dictionary.common.search) : `${String(dictionary.common.search)} (${resultCount})`}
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
  const { locale, dictionary } = useI18n();
  const filterControls = dictionary.search.filterControls as Record<string, string>;
  const cleanOptions = useMemo(() => options.filter((option) => option.value), [options]);
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeOption(query, locale);
  const selectedOptions = useMemo(
    () => values
      .map((value) => cleanOptions.find((option) => option.value === value) ?? { value, label: value })
      .filter((option) => option.value),
    [cleanOptions, values]
  );
  const filteredOptions = useMemo(
    () =>
      searchable
        ? cleanOptions.filter((option) => !normalizedQuery || normalizeOption(option.label, locale).includes(normalizedQuery) || normalizeOption(option.value, locale).includes(normalizedQuery))
        : cleanOptions,
    [cleanOptions, locale, normalizedQuery, searchable]
  );
  const visibleOptions = searchable ? mergeOptions(selectedOptions, filteredOptions).slice(0, 16) : cleanOptions;

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-oto-muted">{label}</span>
        <span className="text-[11px] font-bold text-oto-muted">{values.length > 0 ? filterControls.selectedCount.replace("{count}", String(values.length)) : emptyLabel}</span>
      </div>
      {searchable ? (
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={filterControls.searchPlaceholder.replace("{label}", label.toLocaleLowerCase(getIntlLocale(locale)))}
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
        {visibleOptions.length === 0 ? <p className="text-xs font-semibold text-oto-muted">{filterControls.noResults}</p> : null}
      </div>
    </div>
  );
}

function normalizeOption(value: string, locale: Locale) {
  return value.trim().toLocaleLowerCase(getIntlLocale(locale));
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
