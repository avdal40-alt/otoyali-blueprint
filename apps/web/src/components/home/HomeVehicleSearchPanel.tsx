"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { City, HomeListing, Make, Model } from "@/lib/supabase/types";
import { buildSearchUrl, defaultSearchFilters, type ListingSearchFilters } from "@/lib/search/search-params";
import { getUniqueCities } from "@/lib/search/filter-listings";
import { bodyTypeLabel, cityLabel, colorLabel, driveTypeLabel, fuelLabel, transmissionLabel } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ConditionTabs } from "@/components/search/ConditionTabs";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

export function HomeVehicleSearchPanel({
  makes,
  models,
  cities,
  listings
}: {
  makes: Make[];
  models: Model[];
  cities?: City[];
  listings: HomeListing[];
}) {
  const { locale, dictionary } = useI18n();
  const router = useRouter();
  const [filters, setFilters] = useState<ListingSearchFilters>({ ...defaultSearchFilters, condition: "used" });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const cityOptions = useMemo(() => {
    const catalogCities = (cities ?? [])
      .map((city) => city.city_name?.trim())
      .filter(Boolean) as string[];

    return catalogCities.length > 0 ? catalogCities : getUniqueCities(listings);
  }, [cities, listings]);
  const filteredModels = filters.make ? models.filter((model) => (model.make_name ?? "") === filters.make) : models;
  const hasAdvancedSelection = Boolean(
      filters.city ||
      filters.mileageMax ||
      filters.fuelType ||
      filters.transmission ||
      filters.bodyType ||
      filters.driveType ||
      filters.color ||
      filters.sellerType
  );
  function setValue<K extends keyof ListingSearchFilters>(key: K, value: ListingSearchFilters[K]) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "make" ? { model: "" } : {})
    }));
  }

  function search() {
    router.push(localizePath(buildSearchUrl({ ...filters, advanced: advancedOpen || hasAdvancedSelection }), locale));
  }

  return (
    <section className="rounded-oto border border-oto-border bg-white p-4 shadow-soft md:p-6">
      <div className="max-w-2xl">
        <h1 className="text-h2 text-oto-text md:text-h1">{String(dictionary.home.searchHeroTitle)}</h1>
      </div>
      <div className="mt-5 max-w-md">
        <ConditionTabs value={filters.condition} onChange={(value) => setValue("condition", value)} includeAll={false} />
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-6">
        <label className="grid gap-1">
          <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.brand)}</span>
          <Select value={filters.make} onChange={(event) => setValue("make", event.target.value)}>
            <option value="">{String(dictionary.search.allBrands)}</option>
            {makes.map((make) => (
              <option key={make.make_id} value={make.make_name ?? ""}>
                {make.make_name ?? String(dictionary.common.noInfo)}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.model)}</span>
          <Select value={filters.model} onChange={(event) => setValue("model", event.target.value)}>
            <option value="">{String(dictionary.search.allModels)}</option>
            {filteredModels.map((model) => (
              <option key={model.model_id} value={model.model_name ?? ""}>
                {model.model_name ?? String(dictionary.common.noInfo)}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.priceMin)}</span>
          <Input value={filters.priceMin} onChange={(event) => setValue("priceMin", event.target.value)} placeholder={String(dictionary.search.priceMin)} inputMode="numeric" />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.priceMax)}</span>
          <Input value={filters.priceMax} onChange={(event) => setValue("priceMax", event.target.value)} placeholder={String(dictionary.search.priceMax)} inputMode="numeric" />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.yearMin)}</span>
          <Input value={filters.yearMin} onChange={(event) => setValue("yearMin", event.target.value)} placeholder={String(dictionary.search.yearMin)} inputMode="numeric" />
        </label>
        <label className="grid gap-1">
          <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.yearMax)}</span>
          <Input value={filters.yearMax} onChange={(event) => setValue("yearMax", event.target.value)} placeholder={String(dictionary.search.yearMax)} inputMode="numeric" />
        </label>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 sm:max-w-md">
        <Button
          type="button"
          variant="secondary"
          onClick={() => setAdvancedOpen((current) => !current)}
          className="w-full"
          aria-expanded={advancedOpen}
          aria-controls="home-advanced-filters"
        >
          {String(dictionary.search.advancedFilters)}
        </Button>
        <Button type="button" variant="primary" onClick={search} className="w-full">
          {String(dictionary.search.showListings)}
        </Button>
      </div>

      <div
        id="home-advanced-filters"
        className={
          advancedOpen
            ? "mt-4 max-h-[900px] overflow-hidden opacity-100 transition-all duration-300 ease-out"
            : "max-h-0 overflow-hidden opacity-0 transition-all duration-300 ease-out"
        }
      >
        <div className="rounded-oto border border-oto-border bg-oto-surface p-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="grid gap-1">
              <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.city)}</span>
              <Select value={filters.city} onChange={(event) => setValue("city", event.target.value)}>
                <option value="">{String(dictionary.search.allCities)}</option>
                {cityOptions.map((city) => (
                  <option key={city} value={city}>{cityLabel(city, locale)}</option>
                ))}
              </Select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.mileageMax)}</span>
              <Input value={filters.mileageMax} onChange={(event) => setValue("mileageMax", event.target.value)} placeholder={String(dictionary.search.mileageMax)} inputMode="numeric" />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.fuelType)}</span>
              <Select value={filters.fuelType} onChange={(event) => setValue("fuelType", event.target.value)}>
                <option value="">{String(dictionary.search.allFuelTypes)}</option>
                <option value="gasoline">{fuelLabel("gasoline", locale)}</option>
                <option value="diesel">{fuelLabel("diesel", locale)}</option>
                <option value="hybrid">{fuelLabel("hybrid", locale)}</option>
                <option value="electric">{fuelLabel("electric", locale)}</option>
                <option value="lpg">LPG</option>
                <option value="other">{fuelLabel("other", locale)}</option>
              </Select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.transmission)}</span>
              <Select value={filters.transmission} onChange={(event) => setValue("transmission", event.target.value)}>
                <option value="">{String(dictionary.search.allTransmissions)}</option>
                <option value="automatic">{transmissionLabel("automatic", locale)}</option>
                <option value="manual">{transmissionLabel("manual", locale)}</option>
                <option value="semi_automatic">{transmissionLabel("semi_automatic", locale)}</option>
              </Select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.bodyType)}</span>
              <Select value={filters.bodyType} onChange={(event) => setValue("bodyType", event.target.value)}>
                <option value="">{String(dictionary.search.allBodyTypes)}</option>
                <option value="sedan">{bodyTypeLabel("sedan", locale)}</option>
                <option value="hatchback">{bodyTypeLabel("hatchback", locale)}</option>
                <option value="suv">SUV</option>
                <option value="coupe">{bodyTypeLabel("coupe", locale)}</option>
                <option value="wagon">{bodyTypeLabel("wagon", locale)}</option>
                <option value="pickup">{bodyTypeLabel("pickup", locale)}</option>
                <option value="minivan">{bodyTypeLabel("minivan", locale)}</option>
                <option value="commercial">{bodyTypeLabel("commercial", locale)}</option>
                <option value="other">{bodyTypeLabel("other", locale)}</option>
              </Select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.driveType)}</span>
              <Select value={filters.driveType} onChange={(event) => setValue("driveType", event.target.value)}>
                <option value="">{String(dictionary.search.allDriveTypes)}</option>
                <option value="front">{driveTypeLabel("front", locale)}</option>
                <option value="rear">{driveTypeLabel("rear", locale)}</option>
                <option value="4x4">4x4</option>
                <option value="awd">AWD</option>
              </Select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.color)}</span>
              <Select value={filters.color} onChange={(event) => setValue("color", event.target.value)}>
                <option value="">{String(dictionary.search.allColors)}</option>
                <option value="white">{colorLabel("white", locale)}</option>
                <option value="black">{colorLabel("black", locale)}</option>
                <option value="gray">{colorLabel("gray", locale)}</option>
                <option value="blue">{colorLabel("blue", locale)}</option>
                <option value="red">{colorLabel("red", locale)}</option>
              </Select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.sellerType)}</span>
              <Select value={filters.sellerType} onChange={(event) => setValue("sellerType", event.target.value)}>
                <option value="">{String(dictionary.search.allSellerTypes)}</option>
                <option value="private">{String(dictionary.status.private)}</option>
                <option value="dealer">{String(dictionary.status.dealer)}</option>
              </Select>
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
