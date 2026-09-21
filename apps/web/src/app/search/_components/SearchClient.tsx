"use client";

import { useEffect, useMemo, useState } from "react";
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
import { getUniqueCities } from "@/lib/search/filter-listings";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { interpolate } from "@/i18n/get-dictionary";
import type { SearchCursor } from "@/lib/search/server-search";
import { buildSearchRequest } from "@/lib/search/server-search";

const searchFilterSupport = {
  photos: true,
  priceNegotiable: true,
  promoted: false,
  bodyType: true,
  condition: true,
  sellerType: true,
  driveType: true,
  color: true,
  engineVolume: true,
  damageState: false,
  ownerCount: false,
  trade: true
};

export function SearchClient({
  listings,
  listingMedia = [],
  makes,
  models,
  cities,
  initialFilters,
  nextCursor,
  error,
  debugItems = []
}: {
  listings: HomeListing[];
  listingMedia?: ListingMedia[];
  makes: Make[];
  models: Model[];
  cities?: City[];
  initialFilters: ListingSearchFilters;
  nextCursor: SearchCursor | null;
  error?: string | null;
  debugItems?: Array<Pick<QueryResult<unknown>, "queryName" | "count" | "error">>;
}) {
  const { locale, dictionary } = useI18n();
  const router = useRouter();
  const [filters, setFilters] = useState<ListingSearchFilters>(initialFilters);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  useEffect(() => setFilters(initialFilters), [initialFilters]);
  const cityOptions = useMemo(() => {
    const catalogCities = (cities ?? [])
      .map((city) => city.city_name?.trim())
      .filter(Boolean) as string[];

    return catalogCities.length > 0 ? catalogCities : getUniqueCities(listings);
  }, [cities, listings]);
  const savedSearchRequest = useMemo(() => buildSearchRequest(filters, { makes, models, cities: cities ?? [] }), [cities, filters, makes, models]);
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
        filters.tradeOnly ||
        filters.promotedOnly
    );

  function submit(nextFilters = filters) {
    router.push(localizePath(buildSearchUrl({ ...nextFilters, cursor: null }), locale));
    setMobileFiltersOpen(false);
  }

  function reset() {
    setFilters(defaultSearchFilters);
    router.push(localizePath("/search", locale));
    setMobileFiltersOpen(false);
  }

  function removeFilter(key: keyof ListingSearchFilters) {
    const nextFilters = { ...filters, [key]: defaultSearchFilters[key], cursor: null };
    setFilters(nextFilters);
    router.push(localizePath(buildSearchUrl(nextFilters), locale));
  }

  function setSort(sort: ListingSearchFilters["sort"]) {
    const nextFilters = { ...filters, sort, cursor: null };
    setFilters(nextFilters);
    router.push(localizePath(buildSearchUrl(nextFilters), locale));
  }

  function setCondition(condition: string) {
    const nextFilters = { ...filters, condition, cursor: null };
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
        support={searchFilterSupport}
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
                {interpolate(String(dictionary.search.resultsCount), { count: listings.length })}
              </p>
              <div className="flex flex-wrap items-start gap-2">
                <SavedSearchButton request={savedSearchRequest} />
                <Button
                  type="button"
                  variant={filters.advanced ? "primary" : "secondary"}
                  onClick={() => {
                    const nextFilters = { ...filters, advanced: !filters.advanced, cursor: null };
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
            <VehicleGrid listings={listings} listingMedia={listingMedia} locale={locale} title={String(dictionary.search.noResultsTitle)} body={String(dictionary.search.noResultsBody)} />
            {nextCursor ? (
              <div className="mt-6 flex justify-center">
                <Button type="button" variant="secondary" onClick={() => router.push(localizePath(buildSearchUrl({ ...filters, cursor: nextCursor }), locale))}>
                  {locale === "en" ? "Next results" : "Sonraki ilanlar"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
