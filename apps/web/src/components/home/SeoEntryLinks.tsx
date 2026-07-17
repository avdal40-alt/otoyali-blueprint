import Link from "next/link";
import { getDictionary } from "@/i18n/get-dictionary";
import { localizePath } from "@/i18n/config";
import type { Locale } from "@/i18n/types";

export function SeoEntryLinks({ locale = "tr" }: { locale?: Locale }) {
  const dictionary = getDictionary(locale);
  const categoryLinks = locale === "en"
    ? [
        { label: "Used cars", href: "/ikinci-el-araba" },
        { label: "New cars", href: "/sifir-km-araba" },
        { label: "Electric vehicles", href: "/elektrikli-araclar" },
        { label: "Automatic cars", href: "/otomatik-vites-araclar" },
        { label: "SUV vehicles", href: "/suv-araclar" },
        { label: "BMW listings", href: "/marka/bmw" },
        { label: "İstanbul vehicle listings", href: "/sehir/istanbul" },
        { label: "İzmir vehicle listings", href: "/sehir/izmir" }
      ]
    : [
        { label: "İkinci el araba", href: "/ikinci-el-araba" },
        { label: "Sıfır km araba", href: "/sifir-km-araba" },
        { label: "Elektrikli araçlar", href: "/elektrikli-araclar" },
        { label: "Otomatik vites", href: "/otomatik-vites-araclar" },
        { label: "SUV araçlar", href: "/suv-araclar" },
        { label: "BMW ilanları", href: "/marka/bmw" },
        { label: "İstanbul araç ilanları", href: "/sehir/istanbul" },
        { label: "İzmir araç ilanları", href: "/sehir/izmir" }
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
