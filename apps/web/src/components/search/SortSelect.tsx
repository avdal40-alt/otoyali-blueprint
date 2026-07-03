"use client";

import type { SortOption } from "@/lib/search/search-params";
import { Select } from "@/components/ui/Input";

export function SortSelect({ value, onChange }: { value: SortOption; onChange: (value: SortOption) => void }) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value as SortOption)} className="h-10 min-w-52">
      <option value="newest">En yeni</option>
      <option value="price_asc">Once en dusuk fiyat</option>
      <option value="price_desc">Once en yuksek fiyat</option>
      <option value="year_desc">Once yeni yil</option>
      <option value="mileage_asc">Once dusuk kilometre</option>
    </Select>
  );
}
