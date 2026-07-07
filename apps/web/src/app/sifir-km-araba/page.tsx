import { MarketplaceSeoPage } from "@/components/seo/MarketplaceSeoPage";
import { newCarsSeoConfig } from "@/lib/seo/category-pages";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = buildSeoMetadata({
  title: "Sıfır Km Araba İlanları",
  description: newCarsSeoConfig.description,
  path: newCarsSeoConfig.path
});

export default function NewCarsPage() {
  return <MarketplaceSeoPage config={newCarsSeoConfig} />;
}
