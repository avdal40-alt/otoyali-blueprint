import Link from "next/link";
import type { City } from "@/lib/supabase/types";
import { SectionHeader } from "@/components/layout/PageContainer";
import { citySeoSlug } from "@/lib/seo/slugs";
import { getDictionary, interpolate } from "@/i18n/get-dictionary";
import { localizePath } from "@/i18n/config";
import type { Locale } from "@/i18n/types";

const priority = ["İstanbul", "Ankara", "İzmir", "Antalya", "Bursa", "Adana", "Konya", "Gaziantep"];

export function PopularCitiesSection({ cities, locale = "tr" }: { cities: City[]; locale?: Locale }) {
  const dictionary = getDictionary(locale);
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
      <SectionHeader
        title={String(dictionary.home.popularCities)}
        eyebrow={String(dictionary.home.turkey)}
        action={<Link href={localizePath("/search", locale)} className="text-sm font-bold text-oto-blue">{String(dictionary.home.allListings)}</Link>}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cityLinks.map((city) => (
          <Link key={city.href} href={localizePath(city.href, locale)} className="rounded-oto border border-oto-border bg-white px-4 py-3 text-sm font-black text-oto-text shadow-soft transition hover:border-blue-200 hover:text-oto-blue">
            {interpolate(String(dictionary.home.cityListings), { city: city.label })}
          </Link>
        ))}
      </div>
    </section>
  );
}
