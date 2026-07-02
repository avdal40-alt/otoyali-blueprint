import type { Make } from "@/lib/supabase/types";
import { BrandCard } from "./BrandCard";

export function BrandCarousel({ makes }: { makes: Make[] }) {
  return (
    <div className="scrollbar-hide flex gap-3 overflow-x-auto pb-2">
      {makes.map((make) => (
        <BrandCard key={make.make_id} make={make} />
      ))}
    </div>
  );
}
