import { notFound } from "next/navigation";
import { MarketplaceSeoPage, type MarketplaceSeoConfig } from "@/components/seo/MarketplaceSeoPage";
import { getSeoCatalog, findMakeBySlug } from "@/lib/seo/catalog";
import { makeSeoSlug } from "@/lib/seo/slugs";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: { makeSlug: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { makes } = await getSeoCatalog();
  const make = findMakeBySlug(makes, params.makeSlug);
  if (!make?.make_name) {
    return buildSeoMetadata({
      title: "Marka Bulunamadı",
      description: "Aradığınız marka için aktif SEO sayfası bulunamadı.",
      path: `/marka/${params.makeSlug}`,
      noIndex: true
    });
  }

  return buildSeoMetadata({
    title: `${make.make_name} Araba İlanları`,
    description: `${make.make_name} araç ilanlarını fiyat, model, yıl, kilometre ve şehir bilgilerine göre inceleyin.`,
    path: `/marka/${makeSeoSlug(make.make_name, make.make_slug)}`
  });
}

export default async function MakeSeoPage({ params }: PageProps) {
  const { makes } = await getSeoCatalog();
  const make = findMakeBySlug(makes, params.makeSlug);

  if (!make?.make_name) {
    notFound();
  }

  const path = `/marka/${makeSeoSlug(make.make_name, make.make_slug)}`;
  const config: MarketplaceSeoConfig = {
    path,
    h1: `${make.make_name} araba ilanları`,
    description: `${make.make_name} araç ilanlarını fiyat, model, yıl, kilometre ve şehir bilgilerine göre inceleyin.`,
    ctaLabel: `${make.make_name} ilanlarını gör`,
    filters: { make: make.make_name },
    breadcrumbs: [
      { label: "Ana sayfa", href: "/" },
      { label: "Marka", href: "/search" },
      { label: make.make_name }
    ],
    summary: [
      { label: "Marka", value: make.make_name },
      { label: "Kapsam", value: "Türkiye" }
    ],
    seoText: `${make.make_name} araba ilanları sayfası, aktif araçları model, fiyat, yıl, kilometre ve şehir bilgilerine göre keşfetmeniz için hazırlanmıştır. Daha fazla filtre için arama sayfasına geçebilirsiniz.`
  };

  return <MarketplaceSeoPage config={config} />;
}
