import Link from "next/link";
import { getDictionary } from "@/i18n/get-dictionary";
import { localizePath } from "@/i18n/config";
import type { Locale } from "@/i18n/types";

export function SeoEntryLinks({ locale = "tr" }: { locale?: Locale }) {
  const dictionary = getDictionary(locale);
  const labels = dictionary.home.seoEntryLinks as Record<string, string>;
  const categoryLinks = [
    { label: labels.usedCars, href: "/ikinci-el-araba" },
    { label: labels.newCars, href: "/sifir-km-araba" },
    { label: labels.electricVehicles, href: "/elektrikli-araclar" },
    { label: labels.automaticCars, href: "/otomatik-vites-araclar" },
    { label: labels.suvVehicles, href: "/suv-araclar" },
    { label: labels.bmwListings, href: "/marka/bmw" },
    { label: labels.istanbulListings, href: "/sehir/istanbul" },
    { label: labels.izmirListings, href: "/sehir/izmir" }
  ];

  return (
    <section className="mt-10 rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-oto-blue">{String(dictionary.home.popularSearches)}</p>
          <h2 className="mt-1 text-xl font-black text-oto-text">{String(dictionary.home.discoverFast)}</h2>
        </div>
        <Link href={localizePath("/search", locale)} className="text-sm font-black text-oto-blue">{String(dictionary.home.allListings)}</Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {categoryLinks.map((link) => (
          <Link key={link.href} href={localizePath(link.href, locale)} className="rounded-full bg-oto-surface px-3 py-1.5 text-xs font-black text-oto-muted transition hover:bg-blue-50 hover:text-oto-blue">
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
