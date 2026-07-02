"use client";

import { useMemo, useState } from "react";
import type { HomeListing, Make, Model } from "@/lib/supabase/types";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { FilterDrawer, type SearchFilters } from "@/components/search/FilterDrawer";
import { VehicleGrid } from "@/components/vehicle/VehicleGrid";
import { ErrorState } from "@/components/ui/States";
import { DevQueryDebug } from "@/components/debug/DevQueryDebug";
import type { QueryResult } from "@/lib/queries/listings";

export function SearchClient({
  listings,
  makes,
  models,
  initialQuery,
  initialMake,
  error,
  debugItems = []
}: {
  listings: HomeListing[];
  makes: Make[];
  models: Model[];
  initialQuery?: string;
  initialMake?: string;
  error?: string | null;
  debugItems?: Array<Pick<QueryResult<unknown>, "queryName" | "count" | "error">>;
}) {
  const [filters, setFilters] = useState<SearchFilters>({
    q: initialQuery ?? "",
    make: initialMake ?? "",
    model: "",
    city: "",
    minPrice: "",
    maxPrice: "",
    year: "",
    mileage: "",
    fuelType: "",
    transmission: "",
    sort: "newest"
  });

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const minPrice = Number(filters.minPrice || 0);
    const maxPrice = Number(filters.maxPrice || 0);
    const year = Number(filters.year || 0);
    const mileage = Number(filters.mileage || 0);

    const result = listings.filter((listing) => {
      const title = listing.title ?? "";
      const makeName = listing.make_name ?? "";
      const modelName = listing.model_name ?? "";
      const city = listing.city ?? "";
      const priceAmount = Number(listing.price_amount ?? 0);
      const listingYear = Number(listing.year ?? 0);
      const listingMileage = Number(listing.mileage_km ?? 0);
      const textMatch = q
        ? [title, makeName, modelName, city].join(" ").toLowerCase().includes(q)
        : true;
      const makeMatch = filters.make ? makeName === filters.make : true;
      const modelMatch = filters.model ? modelName === filters.model : true;
      const cityMatch = filters.city ? city === filters.city : true;
      const minMatch = minPrice ? priceAmount >= minPrice : true;
      const maxMatch = maxPrice ? priceAmount <= maxPrice : true;
      const yearMatch = year ? listingYear >= year : true;
      const mileageMatch = mileage ? listingMileage > 0 && listingMileage <= mileage : true;
      const fuelMatch = filters.fuelType ? listing.fuel_type === filters.fuelType : true;
      const transmissionMatch = filters.transmission ? listing.transmission === filters.transmission : true;

      return textMatch && makeMatch && modelMatch && cityMatch && minMatch && maxMatch && yearMatch && mileageMatch && fuelMatch && transmissionMatch;
    });

    return result.sort((a, b) => {
      if (filters.sort === "price_asc") return Number(a.price_amount ?? 0) - Number(b.price_amount ?? 0);
      if (filters.sort === "price_desc") return Number(b.price_amount ?? 0) - Number(a.price_amount ?? 0);
      return new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime();
    });
  }, [filters, listings]);

  return (
    <>
      <AppHeader />
      <PageContainer>
        <SectionHeader title="Arac ara" eyebrow="Filtrele" />
        {error ? <ErrorState message={error} /> : null}
        <DevQueryDebug items={debugItems} />
        <div className="mt-4 grid gap-6 lg:grid-cols-[320px_1fr]">
          <FilterDrawer filters={filters} makes={makes} models={models} onChange={setFilters} />
          <div>
            <p className="mb-4 text-sm font-semibold text-oto-muted">{filtered.length} ilan bulundu</p>
            <VehicleGrid listings={filtered} />
          </div>
        </div>
      </PageContainer>
      <MobileBottomNav />
    </>
  );
}
