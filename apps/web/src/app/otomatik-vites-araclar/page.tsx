import { MarketplaceSeoPage } from "@/components/seo/MarketplaceSeoPage";
import { automaticCarsSeoConfig } from "@/lib/seo/category-pages";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = buildSeoMetadata({
  title: "Otomatik Vites Araba İlanları",
  description: automaticCarsSeoConfig.description,
  path: automaticCarsSeoConfig.path
});

export default function AutomaticCarsPage() {
  return <MarketplaceSeoPage config={automaticCarsSeoConfig} />;
}
