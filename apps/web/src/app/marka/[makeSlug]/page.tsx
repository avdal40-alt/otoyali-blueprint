import { notFound } from "next/navigation";
import { MarketplaceSeoPage, type MarketplaceSeoConfig } from "@/components/seo/MarketplaceSeoPage";
import { getSeoCatalog, findMakeBySlug } from "@/lib/seo/catalog";
import { makeSeoSlug } from "@/lib/seo/slugs";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import { getRequestLocale } from "@/i18n/server";
import { getDynamicSeoCopy } from "@/i18n/dynamic-seo-copy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ makeSlug: string }>;
};

export async function generateMetadata({ params }: PageProps) {
  const copy = getDynamicSeoCopy(await getRequestLocale());
  const resolvedParams = await params;
  const { makes } = await getSeoCatalog();
  const make = findMakeBySlug(makes, resolvedParams.makeSlug);
  if (!make?.make_name) {
    return buildSeoMetadata({
      title: copy.notFound,
      description: copy.notFoundBody,
      path: `/marka/${resolvedParams.makeSlug}`,
      noIndex: true
    });
  }

  return buildSeoMetadata({
    title: copy.listings(make.make_name),
    description: copy.description(make.make_name),
    path: `/marka/${makeSeoSlug(make.make_name, make.make_slug)}`
  });
}

export default async function MakeSeoPage({ params }: PageProps) {
  const copy = getDynamicSeoCopy(await getRequestLocale());
  const resolvedParams = await params;
  const { makes } = await getSeoCatalog();
  const make = findMakeBySlug(makes, resolvedParams.makeSlug);

  if (!make?.make_name) {
    notFound();
  }

  const path = `/marka/${makeSeoSlug(make.make_name, make.make_slug)}`;
  const config: MarketplaceSeoConfig = {
    path,
    h1: copy.listings(make.make_name), description: copy.description(make.make_name), ctaLabel: copy.cta(make.make_name),
    filters: { make: make.make_name },
    breadcrumbs: [
      { label: copy.home, href: "/" }, { label: copy.make, href: "/search" },
      { label: make.make_name }
    ],
    summary: [
      { label: copy.make, value: make.make_name }
    ],
    seoText: copy.seoText(make.make_name)
  };

  return <MarketplaceSeoPage config={config} />;
}
