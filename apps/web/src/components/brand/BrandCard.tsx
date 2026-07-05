import Link from "next/link";
import type { Make } from "@/lib/supabase/types";

export function BrandCard({ make, listingCount = 0 }: { make: Make; listingCount?: number }) {
  const makeName = make.make_name?.trim() || "Bilgi yok";
  const initial = makeName.slice(0, 1).toLocaleUpperCase("tr-TR");

  return (
    <Link
      href={`/search?make=${encodeURIComponent(makeName)}`}
      className="group grid min-h-28 min-w-40 gap-3 rounded-oto border border-oto-border bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-oto-blue hover:shadow-oto"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-oto-surface text-lg font-black text-oto-blue transition group-hover:bg-oto-blue group-hover:text-white">
          {initial}
        </div>
        <span className="rounded-full bg-oto-surface px-2.5 py-1 text-[11px] font-black text-oto-muted">
          {listingCount > 0 ? `${listingCount} ilan` : "Keşfet"}
        </span>
      </div>
      <div>
        <h3 className="text-base font-black text-oto-text">{makeName}</h3>
        <p className="mt-1 text-xs font-semibold text-oto-muted">Modelleri ve ilanları gör</p>
      </div>
    </Link>
  );
}
