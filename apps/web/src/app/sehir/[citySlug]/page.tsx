import { notFound } from "next/navigation";
import { MarketplaceSeoPage, type MarketplaceSeoConfig } from "@/components/seo/MarketplaceSeoPage";
import { getSeoCatalog, findCityBySlug } from "@/lib/seo/catalog";
import { citySeoSlug } from "@/lib/seo/slugs";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import { getRequestLocale } from "@/i18n/server";
import { getDynamicSeoCopy } from "@/i18n/dynamic-seo-copy";
import { cityLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ citySlug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const locale = await getRequestLocale();
  const copy=getDynamicSeoCopy(locale);
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
    title: copy.listings(cityLabel(city.city_name, locale)), description: copy.description(cityLabel(city.city_name, locale)),
    path: `/sehir/${citySeoSlug(city.city_name, city.city_slug)}`
  });
}

export default async function CitySeoPage({ params }: PageProps) {
  const locale = await getRequestLocale();
  const copy=getDynamicSeoCopy(locale);
  const resolvedParams = await params;
  const { cities } = await getSeoCatalog();
  const city = findCityBySlug(cities, resolvedParams.citySlug);

  if (!city?.city_name) {
    notFound();
  }

  const path = `/sehir/${citySeoSlug(city.city_name, city.city_slug)}`;
  const localizedCity = cityLabel(city.city_name, locale);
  const config: MarketplaceSeoConfig = {
    path,
    h1: copy.listings(localizedCity), description: copy.description(localizedCity), ctaLabel: copy.cta(localizedCity),
    filters: { city: city.city_name },
    breadcrumbs: [
      { label: copy.home, href: "/" }, { label: copy.city, href: "/search" },
      { label: localizedCity }
    ],
    summary: [
      { label: copy.city, value: localizedCity }
    ],
    seoText: copy.seoText(localizedCity)
  };

  return <MarketplaceSeoPage config={config} />;
}
