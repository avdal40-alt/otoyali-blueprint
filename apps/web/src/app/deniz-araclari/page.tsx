import { SpecialtyMarketplacePage } from "@/components/verticals/SpecialtyMarketplacePage";
import { buildVerticalSeoMetadata } from "@/lib/marketplace/vertical-seo";

export function generateMetadata() {
  return buildVerticalSeoMetadata("marine");
}

export default function MarineVehiclesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <SpecialtyMarketplacePage verticalId="marine" searchParams={searchParams} />;
}
