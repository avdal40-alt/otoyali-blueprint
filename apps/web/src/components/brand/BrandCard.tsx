import Link from "next/link";
import type { Make } from "@/lib/supabase/types";

export function BrandCard({ make }: { make: Make }) {
  return (
    <Link
      href={`/search?make=${encodeURIComponent(make.make_name)}`}
      className="flex h-20 min-w-32 items-center justify-center rounded-oto border border-oto-border bg-white px-4 text-center text-sm font-black text-oto-text shadow-soft transition hover:border-oto-blue"
    >
      {make.make_name}
    </Link>
  );
}
