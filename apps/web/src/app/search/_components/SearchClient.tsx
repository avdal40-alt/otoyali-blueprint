"use client";

import { useMemo, useState } from "react";
import type { HomeListing, Make, Model } from "@/lib/supabase/types";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { FilterDrawer, type SearchFilters } from "@/components/search/FilterDrawer";
import { VehicleGrid } from "@/components/vehicle/VehicleGrid";
import { ErrorState } from "@/components/ui/States";

export function SearchClient({
  listings,
  makes,
  models,
  initialQuery,
  initialMake,
  error
}: {
  listings: HomeListing[];
  makes: Make[];
  models: Model[];
  initialQuery?: string;
  initialMake?: string;
  error?: string | null;
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
      const textMatch = q
        ? [listing.title, listing.make_name, listing.model_name, listing.city].join(" ").toLowerCase().includes(q)
        : true;
      const makeMatch = filters.make ? listing.make_name === filters.make : true;
      const modelMatch = filters.model ? listing.model_name === filters.model : true;
      const cityMatch = filters.city ? listing.city === filters.city : true;
      const minMatch = minPrice ? listing.price_amount >= minPrice : true;
      const maxMatch = maxPrice ? listing.price_amount <= maxPrice : true;
      const yearMatch = year ? listing.year >= year : true;
      const mileageMatch = mileage ? listing.mileage_km <= mileage : true;
      const fuelMatch = filters.fuelType ? listing.fuel_type === filters.fuelType : true;
      const transmissionMatch = filters.transmission ? listing.transmission === filters.transmission : true;

      return textMatch && makeMatch && modelMatch && cityMatch && minMatch && maxMatch && yearMatch && mileageMatch && fuelMatch && transmissionMatch;
    });

    return result.sort((a, b) => {
      if (filters.sort === "price_asc") return a.price_amount - b.price_amount;
      if (filters.sort === "price_desc") return b.price_amount - a.price_amount;
      return new Date(b.published_at ?? 0).getTime() - new Date(a.published_at ?? 0).getTime();
    });
  }, [filters, listings]);

  return (
    <>
      <AppHeader />
      <PageContainer>
        <SectionHeader title="Arac ara" eyebrow="Filtrele" />
        {error ? <ErrorState message={error} /> : null}
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
