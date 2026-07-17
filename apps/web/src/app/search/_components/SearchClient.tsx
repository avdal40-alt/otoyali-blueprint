"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { City, HomeListing, ListingMedia, Make, Model } from "@/lib/supabase/types";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { ActiveFilterChips } from "@/components/search/ActiveFilterChips";
import { ConditionTabs } from "@/components/search/ConditionTabs";
import { MobileFilterDrawer } from "@/components/search/MobileFilterDrawer";
import { SavedSearchButton } from "@/components/search/SavedSearchButton";
import { SearchFilters } from "@/components/search/SearchFilters";
import { SortSelect } from "@/components/search/SortSelect";
import { VehicleGrid } from "@/components/vehicle/VehicleGrid";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { DevQueryDebug } from "@/components/debug/DevQueryDebug";
import type { QueryResult } from "@/lib/queries/listings";
import { buildSearchUrl, defaultSearchFilters, type ListingSearchFilters } from "@/lib/search/search-params";
import { filterListings, getAvailableFilterFields, getUniqueCities } from "@/lib/search/filter-listings";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { interpolate } from "@/i18n/get-dictionary";

export function SearchClient({
  listings,
  listingMedia = [],
  makes,
  models,
  cities,
  initialFilters,
  error,
  debugItems = []
}: {
  listings: HomeListing[];
  listingMedia?: ListingMedia[];
  makes: Make[];
  models: Model[];
  cities?: City[];
  initialFilters: ListingSearchFilters;
  error?: string | null;
  debugItems?: Array<Pick<QueryResult<unknown>, "queryName" | "count" | "error">>;
}) {
  const { locale, dictionary } = useI18n();
  const router = useRouter();
  const [filters, setFilters] = useState<ListingSearchFilters>(initialFilters);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const cityOptions = useMemo(() => {
    const catalogCities = (cities ?? [])
      .map((city) => city.city_name?.trim())
      .filter(Boolean) as string[];

    return catalogCities.length > 0 ? catalogCities : getUniqueCities(listings);
  }, [cities, listings]);
  const support = useMemo(() => getAvailableFilterFields(listings), [listings]);
  const filtered = useMemo(() => filterListings(listings, filters), [filters, listings]);
  const showAdvancedFilters =
    filters.advanced ||
    Boolean(
      filters.fuelType ||
        filters.transmission ||
        filters.bodyType ||
        filters.driveType ||
        filters.color ||
        filters.condition ||
        filters.sellerType ||
        filters.engineVolume ||
        filters.damageState ||
        filters.ownerCount ||
        filters.onlyWithPhotos ||
        filters.negotiableOnly ||
        filters.promotedOnly
    );

  function submit(nextFilters = filters) {
    router.push(localizePath(buildSearchUrl(nextFilters), locale));
    setMobileFiltersOpen(false);
  }

  function reset() {
    setFilters(defaultSearchFilters);
    router.push(localizePath("/search", locale));
    setMobileFiltersOpen(false);
  }

  function removeFilter(key: keyof ListingSearchFilters) {
    const nextFilters = { ...filters, [key]: defaultSearchFilters[key] };
    setFilters(nextFilters);
    router.push(localizePath(buildSearchUrl(nextFilters), locale));
  }

  function setSort(sort: ListingSearchFilters["sort"]) {
    const nextFilters = { ...filters, sort };
    setFilters(nextFilters);
    router.push(localizePath(buildSearchUrl(nextFilters), locale));
  }

  function setCondition(condition: string) {
    const nextFilters = { ...filters, condition };
    setFilters(nextFilters);
    router.push(localizePath(buildSearchUrl(nextFilters), locale));
  }

  function renderFilterPanel() {
    return (
      <SearchFilters
        filters={filters}
        makes={makes}
        models={models}
        cities={cityOptions}
        showAdvanced={showAdvancedFilters}
        support={support}
        onChange={setFilters}
        onSubmit={() => submit()}
        onReset={reset}
      />
    );
  }

  return (
    <>
      <AppHeader />
      <PageContainer>
        <SectionHeader title={String(dictionary.search.title)} eyebrow={String(dictionary.search.eyebrow)} />
        {error ? <ErrorState message={error} /> : null}
        <DevQueryDebug items={debugItems} />

        <div className="mt-4 rounded-oto border border-oto-border bg-white p-3 shadow-soft">
          <ConditionTabs value={filters.condition} onChange={setCondition} />
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="hidden lg:block">{renderFilterPanel()}</div>
          <div>
            <MobileFilterDrawer open={mobileFiltersOpen} onOpen={() => setMobileFiltersOpen(true)} onClose={() => setMobileFiltersOpen(false)}>
              {renderFilterPanel()}
            </MobileFilterDrawer>
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <p className="text-sm font-semibold text-oto-muted">
                {interpolate(String(dictionary.search.resultsCount), { count: filtered.length })}
              </p>
              <div className="flex flex-wrap items-start gap-2">
                <SavedSearchButton />
                <Button
                  type="button"
                  variant={filters.advanced ? "primary" : "secondary"}
                  onClick={() => {
                    const nextFilters = { ...filters, advanced: !filters.advanced };
                    setFilters(nextFilters);
                    router.push(localizePath(buildSearchUrl(nextFilters), locale));
                  }}
                  className="h-10"
                >
                  {String(dictionary.search.advanced)}
                </Button>
                <SortSelect value={filters.sort} onChange={setSort} />
              </div>
            </div>
            <ActiveFilterChips filters={filters} onRemove={removeFilter} onReset={reset} />
            <VehicleGrid listings={filtered} listingMedia={listingMedia} locale={locale} title={String(dictionary.search.noResultsTitle)} body={String(dictionary.search.noResultsBody)} />
          </div>
        </div>
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
