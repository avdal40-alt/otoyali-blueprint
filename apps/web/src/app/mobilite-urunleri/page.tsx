import { SpecialtyMarketplacePage } from "@/components/verticals/SpecialtyMarketplacePage";
export default function MobilityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { return <SpecialtyMarketplacePage verticalId="mobility" searchParams={searchParams} />; }
