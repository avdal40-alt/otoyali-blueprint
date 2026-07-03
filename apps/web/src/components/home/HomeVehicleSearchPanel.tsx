"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { HomeListing, Make, Model } from "@/lib/supabase/types";
import { buildSearchUrl, defaultSearchFilters, type ListingSearchFilters } from "@/lib/search/search-params";
import { getUniqueCities } from "@/lib/search/filter-listings";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";

export function HomeVehicleSearchPanel({ makes, models, listings }: { makes: Make[]; models: Model[]; listings: HomeListing[] }) {
  const router = useRouter();
  const [filters, setFilters] = useState<ListingSearchFilters>(defaultSearchFilters);
  const cities = useMemo(() => getUniqueCities(listings), [listings]);
  const filteredModels = filters.make ? models.filter((model) => (model.make_name ?? "") === filters.make) : models;

  function setValue<K extends keyof ListingSearchFilters>(key: K, value: ListingSearchFilters[K]) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "make" ? { model: "" } : {})
    }));
  }

  function search(advanced = false) {
    router.push(buildSearchUrl({ ...filters, advanced }));
  }

  return (
    <div className="rounded-oto border border-oto-border bg-white p-4 shadow-oto md:p-5">
      <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-8">
        <label className="grid gap-1 md:col-span-1 lg:col-span-2">
          <span className="text-xs font-bold text-oto-muted">Marka</span>
          <Select value={filters.make} onChange={(event) => setValue("make", event.target.value)}>
            <option value="">Tum markalar</option>
            {makes.map((make) => (
              <option key={make.make_id} value={make.make_name ?? ""}>
                {make.make_name ?? "Bilgi yok"}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1 md:col-span-1 lg:col-span-2">
          <span className="text-xs font-bold text-oto-muted">Model</span>
          <Select value={filters.model} onChange={(event) => setValue("model", event.target.value)}>
            <option value="">Tum modeller</option>
            {filteredModels.map((model) => (
              <option key={model.model_id} value={model.model_name ?? ""}>
                {model.model_name ?? "Bilgi yok"}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1 md:col-span-1 lg:col-span-2">
          <span className="text-xs font-bold text-oto-muted">Sehir</span>
          <Select value={filters.city} onChange={(event) => setValue("city", event.target.value)}>
            <option value="">Tum sehirler</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </Select>
        </label>
        <div className="grid grid-cols-2 gap-2 md:col-span-1 lg:col-span-2">
          <label className="grid gap-1">
            <span className="text-xs font-bold text-oto-muted">Fiyat min</span>
            <Input value={filters.priceMin} onChange={(event) => setValue("priceMin", event.target.value)} placeholder="En az" inputMode="numeric" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-oto-muted">Fiyat max</span>
            <Input value={filters.priceMax} onChange={(event) => setValue("priceMax", event.target.value)} placeholder="En fazla" inputMode="numeric" />
          </label>
        </div>
        <div className="hidden grid-cols-3 gap-2 md:col-span-4 lg:col-span-5 lg:grid">
          <label className="grid gap-1">
            <span className="text-xs font-bold text-oto-muted">Yil min</span>
            <Input value={filters.yearMin} onChange={(event) => setValue("yearMin", event.target.value)} placeholder="2020" inputMode="numeric" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-oto-muted">Yil max</span>
            <Input value={filters.yearMax} onChange={(event) => setValue("yearMax", event.target.value)} placeholder="2026" inputMode="numeric" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-oto-muted">Kilometre max</span>
            <Input value={filters.mileageMax} onChange={(event) => setValue("mileageMax", event.target.value)} placeholder="50000" inputMode="numeric" />
          </label>
        </div>
        <div className="grid gap-2 md:col-span-4 md:grid-cols-2 lg:col-span-3">
          <Button type="button" variant="orange" onClick={() => search(false)} className="w-full">
            Ara
          </Button>
          <Button type="button" variant="secondary" onClick={() => search(true)} className="w-full">
            Gelismis filtreler
          </Button>
        </div>
      </div>
    </div>
  );
}
