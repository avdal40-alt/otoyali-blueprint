import type { Make } from "@/lib/supabase/types";
import { EmptyState } from "@/components/ui/States";
import { BrandCard } from "./BrandCard";

export function BrandCarousel({ makes, countsByMake = {} }: { makes: Make[]; countsByMake?: Record<string, number> }) {
  if (makes.length === 0) {
    return <EmptyState title="Marka bulunamadı" body="Marka verisi geldiğinde burada görünecek." />;
  }

  return (
    <div className="scrollbar-hide grid auto-cols-[minmax(160px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2 md:grid-flow-row md:grid-cols-4">
      {makes.map((make) => {
        const makeName = make.make_name ?? "";
        return <BrandCard key={make.make_id} make={make} listingCount={countsByMake[makeName] ?? 0} />;
      })}
    </div>
  );
}
