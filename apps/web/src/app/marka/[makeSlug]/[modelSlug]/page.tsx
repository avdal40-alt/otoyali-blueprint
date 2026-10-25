import { notFound } from "next/navigation";
import { MarketplaceSeoPage, type MarketplaceSeoConfig } from "@/components/seo/MarketplaceSeoPage";
import { getSeoCatalog, findMakeBySlug, findModelBySlug } from "@/lib/seo/catalog";
import { makeSeoSlug, modelSeoSlug } from "@/lib/seo/slugs";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import { getRequestLocale } from "@/i18n/server";
import { getDynamicSeoCopy } from "@/i18n/dynamic-seo-copy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ makeSlug: string; modelSlug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const copy=getDynamicSeoCopy(await getRequestLocale());
  const resolvedParams = await params;
  const { makes, models } = await getSeoCatalog();
  const make = findMakeBySlug(makes, resolvedParams.makeSlug);
  const model = make ? findModelBySlug(models, make, resolvedParams.modelSlug) : null;

  if (!make?.make_name || !model?.model_name) {
    return buildSeoMetadata({
      title: copy.notFound, description: copy.notFoundBody,
      path: `/marka/${resolvedParams.makeSlug}/${resolvedParams.modelSlug}`,
      noIndex: true
    });
  }

  return buildSeoMetadata({
    title: copy.listings(`${make.make_name} ${model.model_name}`), description: copy.description(`${make.make_name} ${model.model_name}`),
    path: `/marka/${makeSeoSlug(make.make_name, make.make_slug)}/${modelSeoSlug(model.model_name, model.model_slug)}`
  });
}

export default async function MakeModelSeoPage({ params }: PageProps) {
  const copy=getDynamicSeoCopy(await getRequestLocale());
  const resolvedParams = await params;
  const { makes, models } = await getSeoCatalog();
  const make = findMakeBySlug(makes, resolvedParams.makeSlug);
  const model = make ? findModelBySlug(models, make, resolvedParams.modelSlug) : null;

  if (!make?.make_name || !model?.model_name) {
    notFound();
  }

  const path = `/marka/${makeSeoSlug(make.make_name, make.make_slug)}/${modelSeoSlug(model.model_name, model.model_slug)}`;
  const fullName = `${make.make_name} ${model.model_name}`;
  const config: MarketplaceSeoConfig = {
    path,
    h1: copy.listings(fullName), description: copy.description(fullName), ctaLabel: copy.cta(fullName),
    filters: { make: make.make_name, model: model.model_name },
    breadcrumbs: [
      { label: copy.home, href: "/" }, { label: copy.make, href: "/search" },
      { label: make.make_name, href: `/marka/${makeSeoSlug(make.make_name, make.make_slug)}` },
      { label: model.model_name }
    ],
    summary: [
      { label: copy.make, value: make.make_name }, { label: copy.model, value: model.model_name }
    ],
    seoText: copy.seoText(fullName)
  };

  return <MarketplaceSeoPage config={config} />;
}
