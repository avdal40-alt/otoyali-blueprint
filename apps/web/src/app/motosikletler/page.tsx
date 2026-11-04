import { SpecialtyMarketplacePage } from "@/components/verticals/SpecialtyMarketplacePage";
export default function MotorcyclesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) { return <SpecialtyMarketplacePage verticalId="motorcycles" searchParams={searchParams} />; }
