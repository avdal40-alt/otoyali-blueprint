import Link from "next/link";
import type { City, Make } from "@/lib/supabase/types";
import { citySeoSlug, makeSeoSlug } from "@/lib/seo/slugs";

const categoryLinks = [
  { label: "İkinci el araba", href: "/ikinci-el-araba" },
  { label: "Sıfır km araba", href: "/sifir-km-araba" },
  { label: "Elektrikli araçlar", href: "/elektrikli-araclar" },
  { label: "Otomatik vites", href: "/otomatik-vites-araclar" },
  { label: "SUV araçlar", href: "/suv-araclar" }
];

export function SeoEntryLinks({ makes, cities }: { makes: Make[]; cities: City[] }) {
  const makeLinks = prioritizeMakes(makes).slice(0, 6).map((make) => ({
    label: make.make_name || "Marka",
    href: `/marka/${makeSeoSlug(make.make_name, make.make_slug)}`
  }));
  const cityLinks = prioritizeCities(cities).slice(0, 6).map((city) => ({
    label: city.city_name || "Şehir",
    href: `/sehir/${citySeoSlug(city.city_name, city.city_slug)}`
  }));

  return (
    <section className="mt-10 rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-oto-blue">Popüler aramalar</p>
          <h2 className="mt-1 text-xl font-black text-oto-text">Araçları hızlı keşfet</h2>
        </div>
        <Link href="/search" className="text-sm font-black text-oto-blue">Tüm ilanlar</Link>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <LinkBucket title="Kategoriler" links={categoryLinks} />
        <LinkBucket title="Markalar" links={makeLinks} />
        <LinkBucket title="Şehirler" links={cityLinks} />
      </div>
    </section>
  );
}

function LinkBucket({ title, links }: { title: string; links: Array<{ label: string; href: string }> }) {
  return (
    <div>
      <h3 className="text-sm font-black text-oto-text">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="rounded-full bg-oto-surface px-3 py-1.5 text-xs font-black text-oto-muted transition hover:bg-blue-50 hover:text-oto-blue">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function prioritizeMakes(makes: Make[]) {
  const priority = ["BMW", "Mercedes-Benz", "Audi", "Toyota", "Volkswagen", "Tesla", "Honda", "Hyundai", "BYD"];
  return [...makes].sort((a, b) => {
    const aIndex = priority.indexOf(a.make_name ?? "");
    const bIndex = priority.indexOf(b.make_name ?? "");
    if (aIndex !== -1 || bIndex !== -1) return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    return (a.make_name ?? "").localeCompare(b.make_name ?? "", "tr");
  });
}

function prioritizeCities(cities: City[]) {
  const priority = ["İstanbul", "Ankara", "İzmir", "Antalya", "Bursa", "Adana"];
  return [...cities].sort((a, b) => {
    const aIndex = priority.indexOf(a.city_name ?? "");
    const bIndex = priority.indexOf(b.city_name ?? "");
    if (aIndex !== -1 || bIndex !== -1) return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    return (a.city_name ?? "").localeCompare(b.city_name ?? "", "tr");
  });
}
