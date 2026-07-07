import { notFound } from "next/navigation";
import { MarketplaceSeoPage, type MarketplaceSeoConfig } from "@/components/seo/MarketplaceSeoPage";
import { getSeoCatalog, findMakeBySlug, findModelBySlug } from "@/lib/seo/catalog";
import { makeSeoSlug, modelSeoSlug } from "@/lib/seo/slugs";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: { makeSlug: string; modelSlug: string };
};

export async function generateMetadata({ params }: PageProps) {
  const { makes, models } = await getSeoCatalog();
  const make = findMakeBySlug(makes, params.makeSlug);
  const model = make ? findModelBySlug(models, make, params.modelSlug) : null;

  if (!make?.make_name || !model?.model_name) {
    return buildSeoMetadata({
      title: "Model Bulunamadı",
      description: "Aradığınız model için aktif SEO sayfası bulunamadı.",
      path: `/marka/${params.makeSlug}/${params.modelSlug}`,
      noIndex: true
    });
  }

  return buildSeoMetadata({
    title: `${make.make_name} ${model.model_name} İlanları`,
    description: `${make.make_name} ${model.model_name} ilanlarını fiyat, yıl, kilometre, yakıt tipi ve şehir bilgilerine göre karşılaştırın.`,
    path: `/marka/${makeSeoSlug(make.make_name, make.make_slug)}/${modelSeoSlug(model.model_name, model.model_slug)}`
  });
}

export default async function MakeModelSeoPage({ params }: PageProps) {
  const { makes, models } = await getSeoCatalog();
  const make = findMakeBySlug(makes, params.makeSlug);
  const model = make ? findModelBySlug(models, make, params.modelSlug) : null;

  if (!make?.make_name || !model?.model_name) {
    notFound();
  }

  const path = `/marka/${makeSeoSlug(make.make_name, make.make_slug)}/${modelSeoSlug(model.model_name, model.model_slug)}`;
  const fullName = `${make.make_name} ${model.model_name}`;
  const config: MarketplaceSeoConfig = {
    path,
    h1: `${fullName} ilanları`,
    description: `${fullName} ilanlarını fiyat, yıl, kilometre, yakıt tipi ve şehir bilgilerine göre karşılaştırın.`,
    ctaLabel: `${model.model_name} ilanlarını gör`,
    filters: { make: make.make_name, model: model.model_name },
    breadcrumbs: [
      { label: "Ana sayfa", href: "/" },
      { label: "Marka", href: "/search" },
      { label: make.make_name, href: `/marka/${makeSeoSlug(make.make_name, make.make_slug)}` },
      { label: model.model_name }
    ],
    summary: [
      { label: "Marka", value: make.make_name },
      { label: "Model", value: model.model_name }
    ],
    seoText: `${fullName} ilanları sayfasında fiyat, yıl, kilometre, yakıt tipi ve şehir bilgilerini karşılaştırabilirsiniz. Daha ayrıntılı sonuçlar için arama filtrelerini kullanabilirsiniz.`
  };

  return <MarketplaceSeoPage config={config} />;
}
