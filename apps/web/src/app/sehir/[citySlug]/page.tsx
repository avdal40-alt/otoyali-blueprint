import { notFound } from "next/navigation";
import { MarketplaceSeoPage, type MarketplaceSeoConfig } from "@/components/seo/MarketplaceSeoPage";
import { getSeoCatalog, findCityBySlug } from "@/lib/seo/catalog";
import { citySeoSlug } from "@/lib/seo/slugs";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import { getRequestLocale } from "@/i18n/server";
import { getDynamicSeoCopy } from "@/i18n/dynamic-seo-copy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ citySlug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const copy=getDynamicSeoCopy(await getRequestLocale());
  const resolvedParams = await params;
  const { cities } = await getSeoCatalog();
  const city = findCityBySlug(cities, resolvedParams.citySlug);
  if (!city?.city_name) {
    return buildSeoMetadata({
      title: copy.notFound, description: copy.notFoundBody,
      path: `/sehir/${resolvedParams.citySlug}`,
      noIndex: true
    });
  }

  return buildSeoMetadata({
    title: copy.listings(city.city_name), description: copy.description(city.city_name),
    path: `/sehir/${citySeoSlug(city.city_name, city.city_slug)}`
  });
}

export default async function CitySeoPage({ params }: PageProps) {
  const copy=getDynamicSeoCopy(await getRequestLocale());
  const resolvedParams = await params;
  const { cities } = await getSeoCatalog();
  const city = findCityBySlug(cities, resolvedParams.citySlug);

  if (!city?.city_name) {
    notFound();
  }

  const path = `/sehir/${citySeoSlug(city.city_name, city.city_slug)}`;
  const config: MarketplaceSeoConfig = {
    path,
    h1: copy.listings(city.city_name), description: copy.description(city.city_name), ctaLabel: copy.cta(city.city_name),
    filters: { city: city.city_name },
    breadcrumbs: [
      { label: copy.home, href: "/" }, { label: copy.city, href: "/search" },
      { label: city.city_name }
    ],
    summary: [
      { label: copy.city, value: city.city_name }
    ],
    seoText: copy.seoText(city.city_name)
  };

  return <MarketplaceSeoPage config={config} />;
}
