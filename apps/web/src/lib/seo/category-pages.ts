import type { MarketplaceSeoConfig } from "@/components/seo/MarketplaceSeoPage";
import { getCategorySeoCopy, type CategorySeoKind } from "@/i18n/category-seo-copy";

const categoryPaths: Record<CategorySeoKind, string> = {
  used: "/ikinci-el-araba",
  new: "/sifir-km-araba",
  electric: "/elektrikli-araclar",
  automatic: "/otomatik-vites-araclar",
  suv: "/suv-araclar"
};

const categoryFilters: Record<CategorySeoKind, MarketplaceSeoConfig["filters"]> = {
  used: { condition: "used" },
  new: { condition: "new" },
  electric: { fuelType: "electric" },
  automatic: { transmission: "automatic" },
  suv: { bodyType: "suv" }
};

export function getCategorySeoConfig(kind: CategorySeoKind, locale?: string | null): MarketplaceSeoConfig {
  const copy = getCategorySeoCopy(locale)[kind];
  const path = categoryPaths[kind];

  return {
    path,
    h1: copy.h1,
    description: copy.description,
    ctaLabel: copy.ctaLabel,
    filters: categoryFilters[kind],
    breadcrumbs: [{ label: "Jolmod", href: "/" }, { label: copy.h1 }],
    summary: [{ label: copy.summaryLabel, value: copy.summaryValue }],
    seoText: copy.seoText
  };
}
