import Link from "next/link";
import type { Make } from "@/lib/supabase/types";
import { localizePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/types";

export function BrandCard({ make, locale = "tr" }: { make: Make; locale?: Locale }) {
  const dictionary = getDictionary(locale);
  const makeName = make.make_name?.trim() || String(dictionary.common.noInfo);
  const initial = makeName.slice(0, 1).toLocaleUpperCase("tr-TR");

  return (
    <Link
      href={localizePath(`/search?make=${encodeURIComponent(makeName)}`, locale)}
      className="group flex min-h-24 min-w-40 items-center gap-3 rounded-oto border border-oto-border bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-oto-blue hover:shadow-oto"
      aria-label={`${makeName} — ${String(dictionary.home.browseByMake)}`}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-oto-surface text-lg font-black text-oto-blue transition group-hover:bg-oto-blue group-hover:text-white">
        {initial}
      </div>
      <h3 className="text-base font-black text-oto-text">{makeName}</h3>
    </Link>
  );
}
