"use client";

import type { Make, Model } from "@/lib/supabase/types";
import { Input, Select } from "@/components/ui/Input";

export type SearchFilters = {
  q: string;
  make: string;
  model: string;
  city: string;
  minPrice: string;
  maxPrice: string;
  year: string;
  mileage: string;
  fuelType: string;
  transmission: string;
  sort: string;
};

export function FilterDrawer({
  filters,
  makes,
  models,
  onChange
}: {
  filters: SearchFilters;
  makes: Make[];
  models: Model[];
  onChange: (filters: SearchFilters) => void;
}) {
  const filteredModels = filters.make ? models.filter((model) => (model.make_name ?? "") === filters.make) : models;

  function setValue(key: keyof SearchFilters, value: string) {
    onChange({
      ...filters,
      [key]: value,
      ...(key === "make" ? { model: "" } : {})
    });
  }

  return (
    <aside className="rounded-oto border border-oto-border bg-white p-4 shadow-soft">
      <div className="grid gap-3">
        <Input value={filters.q} onChange={(event) => setValue("q", event.target.value)} placeholder="Arama" />
        <Select value={filters.make} onChange={(event) => setValue("make", event.target.value)}>
          <option value="">Marka</option>
          {makes.map((make) => (
            <option key={make.make_id} value={make.make_name ?? ""}>
              {make.make_name ?? "Bilgi yok"}
            </option>
          ))}
        </Select>
        <Select value={filters.model} onChange={(event) => setValue("model", event.target.value)}>
          <option value="">Model</option>
          {filteredModels.map((model) => (
            <option key={model.model_id} value={model.model_name ?? ""}>
              {model.model_name ?? "Bilgi yok"}
            </option>
          ))}
        </Select>
        <Select value={filters.city} onChange={(event) => setValue("city", event.target.value)}>
          <option value="">Şehir</option>
          {[
            { value: "Istanbul", label: "İstanbul" },
            { value: "Ankara", label: "Ankara" },
            { value: "Izmir", label: "İzmir" },
            { value: "Antalya", label: "Antalya" }
          ].map((city) => (
            <option key={city.value} value={city.value}>
              {city.label}
            </option>
          ))}
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Input value={filters.minPrice} onChange={(event) => setValue("minPrice", event.target.value)} placeholder="Min fiyat" inputMode="numeric" />
          <Input value={filters.maxPrice} onChange={(event) => setValue("maxPrice", event.target.value)} placeholder="Max fiyat" inputMode="numeric" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input value={filters.year} onChange={(event) => setValue("year", event.target.value)} placeholder="Yıl" inputMode="numeric" />
          <Input value={filters.mileage} onChange={(event) => setValue("mileage", event.target.value)} placeholder="Max km" inputMode="numeric" />
        </div>
        <Select value={filters.fuelType} onChange={(event) => setValue("fuelType", event.target.value)}>
          <option value="">Yakıt</option>
          <option value="gasoline">Benzin</option>
          <option value="diesel">Dizel</option>
          <option value="lpg">LPG</option>
          <option value="electric">Elektrik</option>
          <option value="hybrid">Hibrit</option>
        </Select>
        <Select value={filters.transmission} onChange={(event) => setValue("transmission", event.target.value)}>
          <option value="">Vites</option>
          <option value="manual">Manuel</option>
          <option value="automatic">Otomatik</option>
        </Select>
        <Select value={filters.sort} onChange={(event) => setValue("sort", event.target.value)}>
          <option value="newest">En yeni</option>
          <option value="price_asc">Fiyat artan</option>
          <option value="price_desc">Fiyat azalan</option>
        </Select>
      </div>
    </aside>
  );
}
