import { MarketplaceSeoPage } from "@/components/seo/MarketplaceSeoPage";
import { suvCarsSeoConfig } from "@/lib/seo/category-pages";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = buildSeoMetadata({
  title: "SUV Araç İlanları",
  description: suvCarsSeoConfig.description,
  path: suvCarsSeoConfig.path
});

export default function SuvCarsPage() {
  return <MarketplaceSeoPage config={suvCarsSeoConfig} />;
}
