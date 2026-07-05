"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { City, HomeListing, Make, Model } from "@/lib/supabase/types";
import { buildSearchUrl, defaultSearchFilters, type ListingSearchFilters } from "@/lib/search/search-params";
import { getUniqueCities } from "@/lib/search/filter-listings";
import { cityLabel } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ConditionTabs } from "@/components/search/ConditionTabs";

const quickTags: Array<{ label: string; filters: Partial<ListingSearchFilters> }> = [
  { label: "1.500.000 TRY altı", filters: { priceMax: "1500000" } },
  { label: "SUV", filters: { bodyType: "suv", advanced: true } },
  { label: "Otomatik", filters: { transmission: "automatic", advanced: true } },
  { label: "Elektrikli", filters: { fuelType: "electric", advanced: true } },
  { label: "Ankara", filters: { city: "Ankara" } },
  { label: "İstanbul", filters: { city: "İstanbul" } },
  { label: "Düşük kilometre", filters: { mileageMax: "50000" } }
];

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

  function setValue<K extends keyof ListingSearchFilters>(key: K, value: ListingSearchFilters[K]) {
    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "make" ? { model: "" } : {})
    }));
  }

  function search() {
    router.push(buildSearchUrl({ ...filters, advanced: advancedOpen || hasAdvancedSelection }));
  }

  function quickSearch(nextFilters: Partial<ListingSearchFilters>) {
    router.push(buildSearchUrl({ ...defaultSearchFilters, ...nextFilters }));
  }

  return (
    <div className="rounded-oto border border-oto-border bg-white p-4 shadow-oto md:p-5">
      <div className="mb-4">
        <ConditionTabs value={filters.condition} onChange={(value) => setValue("condition", value)} />
      </div>

      <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-8">
        <label className="grid gap-1 md:col-span-1 lg:col-span-2">
          <span className="text-xs font-bold text-oto-muted">Marka</span>
          <Select value={filters.make} onChange={(event) => setValue("make", event.target.value)}>
            <option value="">Tüm markalar</option>
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
            <option value="">Tüm modeller</option>
            {filteredModels.map((model) => (
              <option key={model.model_id} value={model.model_name ?? ""}>
                {model.model_name ?? "Bilgi yok"}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1 md:col-span-1 lg:col-span-2">
          <span className="text-xs font-bold text-oto-muted">Şehir</span>
          <Select value={filters.city} onChange={(event) => setValue("city", event.target.value)}>
            <option value="">Tüm şehirler</option>
            {cityOptions.map((city) => (
              <option key={city} value={city}>
                {cityLabel(city)}
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
            <span className="text-xs font-bold text-oto-muted">Yıl min</span>
            <Input value={filters.yearMin} onChange={(event) => setValue("yearMin", event.target.value)} placeholder="2020" inputMode="numeric" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-oto-muted">Yıl max</span>
            <Input value={filters.yearMax} onChange={(event) => setValue("yearMax", event.target.value)} placeholder="2026" inputMode="numeric" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-oto-muted">Kilometre max</span>
            <Input value={filters.mileageMax} onChange={(event) => setValue("mileageMax", event.target.value)} placeholder="50000" inputMode="numeric" />
          </label>
        </div>
        <div className="grid gap-2 md:col-span-4 md:grid-cols-2 lg:col-span-3">
          <Button type="button" variant="orange" onClick={search} className="w-full">
            Ara
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setAdvancedOpen((current) => !current)}
            className="w-full"
            aria-expanded={advancedOpen}
            aria-controls="home-advanced-filters"
          >
            Gelişmiş filtreler
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
              <span className="text-xs font-bold text-oto-muted">Yakıt tipi</span>
              <Select value={filters.fuelType} onChange={(event) => setValue("fuelType", event.target.value)}>
                <option value="">Tüm yakıt tipleri</option>
                <option value="gasoline">Benzin</option>
                <option value="diesel">Dizel</option>
                <option value="lpg">LPG</option>
                <option value="hybrid">Hibrit</option>
                <option value="electric">Elektrikli</option>
              </Select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold text-oto-muted">Vites</span>
              <Select value={filters.transmission} onChange={(event) => setValue("transmission", event.target.value)}>
                <option value="">Tüm vitesler</option>
                <option value="automatic">Otomatik</option>
                <option value="manual">Manuel</option>
              </Select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold text-oto-muted">Kasa tipi</span>
              <Select value={filters.bodyType} onChange={(event) => setValue("bodyType", event.target.value)}>
                <option value="">Tüm kasa tipleri</option>
                <option value="sedan">Sedan</option>
                <option value="hatchback">Hatchback</option>
                <option value="suv">SUV</option>
                <option value="wagon">Station wagon</option>
                <option value="coupe">Coupe</option>
              </Select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold text-oto-muted">Çekiş</span>
              <Select value={filters.driveType} onChange={(event) => setValue("driveType", event.target.value)}>
                <option value="">Tüm çekiş tipleri</option>
                <option value="front">Önden çekiş</option>
                <option value="rear">Arkadan itiş</option>
                <option value="awd">4x4 / AWD</option>
              </Select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold text-oto-muted">Renk</span>
              <Select value={filters.color} onChange={(event) => setValue("color", event.target.value)}>
                <option value="">Tüm renkler</option>
                <option value="white">Beyaz</option>
                <option value="black">Siyah</option>
                <option value="gray">Gri</option>
                <option value="blue">Mavi</option>
                <option value="red">Kırmızı</option>
              </Select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold text-oto-muted">Durum</span>
              <Select value={filters.condition} onChange={(event) => setValue("condition", event.target.value)}>
                <option value="">Tüm ilanlar</option>
                <option value="used">İkinci el</option>
                <option value="new">Sıfır km</option>
              </Select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold text-oto-muted">Satıcı tipi</span>
              <Select value={filters.sellerType} onChange={(event) => setValue("sellerType", event.target.value)}>
                <option value="">Tümü</option>
                <option value="private">Bireysel</option>
                <option value="dealer">Galeri</option>
              </Select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold text-oto-muted">Sıralama</span>
              <Select value={filters.sort} onChange={(event) => setValue("sort", event.target.value as ListingSearchFilters["sort"])}>
                <option value="newest">En yeni</option>
                <option value="price_asc">Önce en düşük fiyat</option>
                <option value="price_desc">Önce en yüksek fiyat</option>
                <option value="year_desc">Önce yeni yıl</option>
                <option value="mileage_asc">Önce düşük kilometre</option>
              </Select>
            </label>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 rounded-md bg-white px-3 py-3 text-sm font-semibold text-oto-muted">
              <input type="checkbox" checked={filters.tradeOnly} onChange={(event) => setValue("tradeOnly", event.target.checked)} />
              Takas
            </label>
            <label className="flex items-center gap-2 rounded-md bg-white px-3 py-3 text-sm font-semibold text-oto-muted">
              <input type="checkbox" checked={filters.onlyWithPhotos} onChange={(event) => setValue("onlyWithPhotos", event.target.checked)} />
              Fotoğraflı ilanlar
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
