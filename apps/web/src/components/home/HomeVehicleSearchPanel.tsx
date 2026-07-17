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
  const [filters, setFilters] = useState<ListingSearchFilters>(defaultSearchFilters);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const cityOptions = useMemo(() => {
    const catalogCities = (cities ?? [])
      .map((city) => city.city_name?.trim())
      .filter(Boolean) as string[];

    return catalogCities.length > 0 ? catalogCities : getUniqueCities(listings);
  }, [cities, listings]);
  const filteredModels = filters.make ? models.filter((model) => (model.make_name ?? "") === filters.make) : models;
  const hasAdvancedSelection = Boolean(
    filters.fuelType ||
      filters.transmission ||
      filters.bodyType ||
      filters.driveType ||
      filters.color ||
      filters.condition ||
      filters.sellerType ||
      filters.onlyWithPhotos ||
      filters.tradeOnly ||
      filters.sort !== "newest"
  );
  const quickTags: Array<{ label: string; filters: Partial<ListingSearchFilters> }> = [
    { label: locale === "en" ? "Under TRY 1,500,000" : "1.500.000 TL altı", filters: { priceMax: "1500000" } },
    { label: "SUV", filters: { bodyType: "suv", advanced: true } },
    { label: transmissionLabel("automatic", locale), filters: { transmission: "automatic", advanced: true } },
    { label: fuelLabel("electric", locale), filters: { fuelType: "electric", advanced: true } },
    { label: "Ankara", filters: { city: "Ankara" } },
    { label: "İstanbul", filters: { city: "İstanbul" } },
    { label: locale === "en" ? "Low mileage" : "Düşük kilometre", filters: { mileageMax: "50000" } }
  ];

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

  function quickSearch(nextFilters: Partial<ListingSearchFilters>) {
    router.push(localizePath(buildSearchUrl({ ...defaultSearchFilters, ...nextFilters }), locale));
  }

  return (
    <div className="rounded-oto border border-oto-border bg-white p-4 shadow-oto md:p-5">
      <div className="mb-4">
        <ConditionTabs value={filters.condition} onChange={(value) => setValue("condition", value)} />
      </div>

      <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-8">
        <label className="grid gap-1 md:col-span-1 lg:col-span-2">
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
        <label className="grid gap-1 md:col-span-1 lg:col-span-2">
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
        <label className="grid gap-1 md:col-span-1 lg:col-span-2">
          <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.city)}</span>
          <Select value={filters.city} onChange={(event) => setValue("city", event.target.value)}>
            <option value="">{String(dictionary.search.allCities)}</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {cityLabel(city, locale)}
              </option>
            ))}
          </Select>
        </label>
        <div className="grid grid-cols-2 gap-2 md:col-span-1 lg:col-span-2">
          <label className="grid gap-1">
            <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.priceMin)}</span>
            <Input value={filters.priceMin} onChange={(event) => setValue("priceMin", event.target.value)} placeholder={locale === "en" ? "Min" : "En az"} inputMode="numeric" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.priceMax)}</span>
            <Input value={filters.priceMax} onChange={(event) => setValue("priceMax", event.target.value)} placeholder={locale === "en" ? "Max" : "En fazla"} inputMode="numeric" />
          </label>
        </div>
        <div className="hidden grid-cols-3 gap-2 md:col-span-4 lg:col-span-5 lg:grid">
          <label className="grid gap-1">
            <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.yearMin)}</span>
            <Input value={filters.yearMin} onChange={(event) => setValue("yearMin", event.target.value)} placeholder="2020" inputMode="numeric" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.yearMax)}</span>
            <Input value={filters.yearMax} onChange={(event) => setValue("yearMax", event.target.value)} placeholder="2026" inputMode="numeric" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.mileageMax)}</span>
            <Input value={filters.mileageMax} onChange={(event) => setValue("mileageMax", event.target.value)} placeholder="50000" inputMode="numeric" />
          </label>
        </div>
        <div className="grid gap-2 md:col-span-4 md:grid-cols-2 lg:col-span-3">
          <Button type="button" variant="orange" onClick={search} className="w-full">
            {String(dictionary.common.search)}
          </Button>
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
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {quickTags.map((tag) => (
          <button
            key={tag.label}
            type="button"
            onClick={() => quickSearch(tag.filters)}
            className="rounded-full border border-oto-border bg-oto-surface px-3 py-1.5 text-xs font-bold text-oto-muted transition hover:border-oto-blue hover:bg-white hover:text-oto-text"
          >
            {tag.label}
          </button>
        ))}
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
              <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.condition)}</span>
              <Select value={filters.condition} onChange={(event) => setValue("condition", event.target.value)}>
                <option value="">{String(dictionary.home.allListings)}</option>
                <option value="used">{String(dictionary.status.used)}</option>
                <option value="new">{String(dictionary.status.new)}</option>
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
            <label className="grid gap-1">
              <span className="text-xs font-bold text-oto-muted">{String(dictionary.search.sort)}</span>
              <Select value={filters.sort} onChange={(event) => setValue("sort", event.target.value as ListingSearchFilters["sort"])}>
                <option value="newest">{String(dictionary.search.newest)}</option>
                <option value="price_asc">{String(dictionary.search.priceAsc)}</option>
                <option value="price_desc">{String(dictionary.search.priceDesc)}</option>
                <option value="year_desc">{String(dictionary.search.yearDesc)}</option>
                <option value="mileage_asc">{String(dictionary.search.mileageAsc)}</option>
              </Select>
            </label>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-md bg-white px-3 py-3 text-sm font-semibold text-oto-muted">
              <input type="checkbox" checked={filters.tradeOnly} onChange={(event) => setValue("tradeOnly", event.target.checked)} />
              {String(dictionary.search.trade)}
            </label>
            <label className="flex items-center gap-2 rounded-md bg-white px-3 py-3 text-sm font-semibold text-oto-muted">
              <input type="checkbox" checked={filters.onlyWithPhotos} onChange={(event) => setValue("onlyWithPhotos", event.target.checked)} />
              {String(dictionary.search.withPhotos)}
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
