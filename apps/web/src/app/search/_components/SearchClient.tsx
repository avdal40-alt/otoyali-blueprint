"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { HomeListing, ListingMedia, Make, Model } from "@/lib/supabase/types";
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

export function SearchClient({
  listings,
  listingMedia = [],
  makes,
  models,
  initialFilters,
  error,
  debugItems = []
}: {
  listings: HomeListing[];
  listingMedia?: ListingMedia[];
  makes: Make[];
  models: Model[];
  initialFilters: ListingSearchFilters;
  error?: string | null;
  debugItems?: Array<Pick<QueryResult<unknown>, "queryName" | "count" | "error">>;
}) {
  const router = useRouter();
  const [filters, setFilters] = useState<ListingSearchFilters>(initialFilters);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const cities = useMemo(() => getUniqueCities(listings), [listings]);
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
    router.push(buildSearchUrl(nextFilters));
    setMobileFiltersOpen(false);
  }

  function reset() {
    setFilters(defaultSearchFilters);
    router.push("/search");
    setMobileFiltersOpen(false);
  }

  function removeFilter(key: keyof ListingSearchFilters) {
    const nextFilters = { ...filters, [key]: defaultSearchFilters[key] };
    setFilters(nextFilters);
    router.push(buildSearchUrl(nextFilters));
  }

  function setSort(sort: ListingSearchFilters["sort"]) {
    const nextFilters = { ...filters, sort };
    setFilters(nextFilters);
    router.push(buildSearchUrl(nextFilters));
  }

  function setCondition(condition: string) {
    const nextFilters = { ...filters, condition };
    setFilters(nextFilters);
    router.push(buildSearchUrl(nextFilters));
  }

  function renderFilterPanel() {
    return (
      <SearchFilters
        filters={filters}
        makes={makes}
        models={models}
        cities={cities}
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
        <SectionHeader title="Araç ara" eyebrow="Pazar" />
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
                <span className="font-black text-oto-text">{filtered.length}</span> ilan bulundu
              </p>
              <div className="flex flex-wrap items-start gap-2">
                <SavedSearchButton />
                <Button
                  type="button"
                  variant={filters.advanced ? "primary" : "secondary"}
                  onClick={() => {
                    const nextFilters = { ...filters, advanced: !filters.advanced };
                    setFilters(nextFilters);
                    router.push(buildSearchUrl(nextFilters));
                  }}
                  className="h-10"
                >
                  Gelişmiş
                </Button>
                <SortSelect value={filters.sort} onChange={setSort} />
              </div>
            </div>
            <ActiveFilterChips filters={filters} onRemove={removeFilter} onReset={reset} />
            <VehicleGrid listings={filtered} listingMedia={listingMedia} />
          </div>
        </div>
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
