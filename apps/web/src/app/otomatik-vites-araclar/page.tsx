import { MarketplaceSeoPage } from "@/components/seo/MarketplaceSeoPage";
import { getCategorySeoConfig } from "@/lib/seo/category-pages";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import { getRequestLocale } from "@/i18n/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
  const config = getCategorySeoConfig("automatic", await getRequestLocale());
  return buildSeoMetadata({ title: config.h1, description: config.description, path: config.path });
}

export default async function AutomaticCarsPage() {
  return <MarketplaceSeoPage config={getCategorySeoConfig("automatic", await getRequestLocale())} />;
}
