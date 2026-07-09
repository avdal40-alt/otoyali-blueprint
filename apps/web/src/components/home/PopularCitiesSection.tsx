import Link from "next/link";
import type { City } from "@/lib/supabase/types";
import { SectionHeader } from "@/components/layout/PageContainer";
import { citySeoSlug } from "@/lib/seo/slugs";

const priority = ["İstanbul", "Ankara", "İzmir", "Antalya", "Bursa", "Adana", "Konya", "Gaziantep"];

export function PopularCitiesSection({ cities }: { cities: City[] }) {
  const cityLinks = [...cities]
    .sort((a, b) => {
      const aIndex = priority.indexOf(a.city_name ?? "");
      const bIndex = priority.indexOf(b.city_name ?? "");
      if (aIndex !== -1 || bIndex !== -1) return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      return (a.city_name ?? "").localeCompare(b.city_name ?? "", "tr");
    })
    .slice(0, 8)
    .map((city) => ({
      label: city.city_name || "Şehir",
      href: `/sehir/${citySeoSlug(city.city_name, city.city_slug)}`
    }));

  if (cityLinks.length === 0) return null;

  return (
    <section className="mt-8">
      <SectionHeader title="Popüler şehirler" eyebrow="Türkiye" action={<Link href="/search" className="text-sm font-bold text-oto-blue">Tüm ilanlar</Link>} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cityLinks.map((city) => (
          <Link key={city.href} href={city.href} className="rounded-oto border border-oto-border bg-white px-4 py-3 text-sm font-black text-oto-text shadow-soft transition hover:border-blue-200 hover:text-oto-blue">
            {city.label} araç ilanları
          </Link>
        ))}
      </div>
    </section>
  );
}
