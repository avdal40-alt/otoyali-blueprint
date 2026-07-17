"use client";

import type { SortOption } from "@/lib/search/search-params";
import { Select } from "@/components/ui/Input";
import { useI18n } from "@/i18n/client";

export function SortSelect({ value, onChange }: { value: SortOption; onChange: (value: SortOption) => void }) {
  const { dictionary } = useI18n();

  return (
    <Select value={value} onChange={(event) => onChange(event.target.value as SortOption)} className="h-10 min-w-52">
      <option value="newest">{String(dictionary.search.newest)}</option>
      <option value="price_asc">{String(dictionary.search.priceAsc)}</option>
      <option value="price_desc">{String(dictionary.search.priceDesc)}</option>
      <option value="year_desc">{String(dictionary.search.yearDesc)}</option>
      <option value="mileage_asc">{String(dictionary.search.mileageAsc)}</option>
    </Select>
  );
}
