import { MarketplaceSeoPage } from "@/components/seo/MarketplaceSeoPage";
import { electricCarsSeoConfig } from "@/lib/seo/category-pages";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = buildSeoMetadata({
  title: "Elektrikli Araç İlanları",
  description: electricCarsSeoConfig.description,
  path: electricCarsSeoConfig.path
});

export default function ElectricCarsPage() {
  return <MarketplaceSeoPage config={electricCarsSeoConfig} />;
}
