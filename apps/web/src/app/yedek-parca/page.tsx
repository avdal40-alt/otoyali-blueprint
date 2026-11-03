import { PartsMarketplacePage } from "@/components/verticals/PartsMarketplacePage";
import { buildVerticalSeoMetadata } from "@/lib/marketplace/vertical-seo";

export function generateMetadata() {
  return buildVerticalSeoMetadata("parts");
}

export default function SparePartsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PartsMarketplacePage searchParams={searchParams} />;
}
