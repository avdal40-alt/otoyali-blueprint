import { notFound } from "next/navigation";
import { MarketplaceSeoPage, type MarketplaceSeoConfig } from "@/components/seo/MarketplaceSeoPage";
import { getSeoCatalog, findCityBySlug } from "@/lib/seo/catalog";
import { citySeoSlug } from "@/lib/seo/slugs";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: { citySlug: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { cities } = await getSeoCatalog();
  const city = findCityBySlug(cities, params.citySlug);
  if (!city?.city_name) {
    return buildSeoMetadata({
      title: "Şehir Bulunamadı",
      description: "Aradığınız şehir için aktif SEO sayfası bulunamadı.",
      path: `/sehir/${params.citySlug}`,
      noIndex: true
    });
  }

  return buildSeoMetadata({
    title: `${city.city_name} Araba İlanları`,
    description: `${city.city_name} içindeki araba ilanlarını marka, model, fiyat ve teknik özelliklere göre keşfedin.`,
    path: `/sehir/${citySeoSlug(city.city_name, city.city_slug)}`
  });
}

export default async function CitySeoPage({ params }: PageProps) {
  const { cities } = await getSeoCatalog();
  const city = findCityBySlug(cities, params.citySlug);

  if (!city?.city_name) {
    notFound();
  }

  const path = `/sehir/${citySeoSlug(city.city_name, city.city_slug)}`;
  const config: MarketplaceSeoConfig = {
    path,
    h1: `${city.city_name} araba ilanları`,
    description: `${city.city_name} içindeki araba ilanlarını marka, model, fiyat ve teknik özelliklere göre keşfedin.`,
    ctaLabel: `${city.city_name} ilanlarını gör`,
    filters: { city: city.city_name },
    breadcrumbs: [
      { label: "Ana sayfa", href: "/" },
      { label: "Şehir", href: "/search" },
      { label: city.city_name }
    ],
    summary: [
      { label: "Şehir", value: city.city_name },
      { label: "Kapsam", value: "Aktif ilanlar" }
    ],
    seoText: `${city.city_name} araba ilanları sayfasında şehir içindeki aktif araçları marka, model, fiyat ve teknik özelliklere göre inceleyebilirsiniz. Daha fazla filtre için arama sayfasına geçebilirsiniz.`
  };

  return <MarketplaceSeoPage config={config} />;
}
