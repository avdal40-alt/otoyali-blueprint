import { MarketplaceSeoPage } from "@/components/seo/MarketplaceSeoPage";
import { usedCarsSeoConfig } from "@/lib/seo/category-pages";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = buildSeoMetadata({
  title: "İkinci El Araba İlanları",
  description: usedCarsSeoConfig.description,
  path: usedCarsSeoConfig.path
});

export default function UsedCarsPage() {
  return <MarketplaceSeoPage config={usedCarsSeoConfig} />;
}
