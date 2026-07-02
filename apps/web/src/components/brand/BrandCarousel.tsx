import type { Make } from "@/lib/supabase/types";
import { EmptyState } from "@/components/ui/States";
import { BrandCard } from "./BrandCard";

export function BrandCarousel({ makes }: { makes: Make[] }) {
  if (makes.length === 0) {
    return <EmptyState title="Marka bulunamadi" body="Marka verisi geldiginde burada gorunecek." />;
  }

  return (
    <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-2">
      {makes.map((make) => (
        <BrandCard key={make.make_id} make={make} />
      ))}
    </div>
  );
}
