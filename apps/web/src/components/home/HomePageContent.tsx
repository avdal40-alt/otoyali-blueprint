import Link from "next/link";
import type { HomeListing, Make } from "@/lib/supabase/types";
import { tr } from "@/i18n/tr";
import { en } from "@/i18n/en";
import { newsArticles } from "@/data/news";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { SearchBar } from "@/components/search/SearchBar";
import { BrandCarousel } from "@/components/brand/BrandCarousel";
import { VehicleGrid } from "@/components/vehicle/VehicleGrid";
import { VehicleCard } from "@/components/vehicle/VehicleCard";
import { NewsGrid } from "@/components/news/NewsGrid";
import { ButtonLink } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";

export function HomePageContent({
  listings,
  makes,
  error,
  locale = "tr"
}: {
  listings: HomeListing[];
  makes: Make[];
  error?: string | null;
  locale?: "tr" | "en";
}) {
  const dict = locale === "en" ? en : tr;
  const featured = listings.slice(0, 3);
  const latest = listings.slice(0, 6);

  return (
    <>
      <AppHeader />
      <PageContainer className="pt-5">
        <section className="rounded-oto bg-oto-text px-5 py-8 text-white shadow-oto md:px-10 md:py-12">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-wide text-oto-cyan">OTOYALI</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">{dict.heroTitle}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/75 md:text-lg">{dict.heroSubtitle}</p>
          </div>
          <div className="mt-8 max-w-3xl">
            <SearchBar placeholder={dict.searchPlaceholder} />
          </div>
        </section>

        {error ? <div className="mt-6"><ErrorState message={error} /></div> : null}

        <section className="mt-8">
          <SectionHeader title="Populer markalar" eyebrow="Kesfet" action={<Link href="/search" className="text-sm font-bold text-oto-blue">Tumunu gor</Link>} />
          <BrandCarousel makes={makes} />
        </section>

        <section className="mt-10">
          <SectionHeader title="One cikan ilanlar" eyebrow="Vitrin" action={<ButtonLink href="/sell" variant="orange">Ilan yayinla</ButtonLink>} />
          {featured.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {featured.map((listing) => (
                <VehicleCard key={listing.listing_id} listing={listing} />
              ))}
            </div>
          ) : (
            <VehicleGrid listings={[]} />
          )}
        </section>

        <section className="mt-10">
          <SectionHeader title="En yeni ilanlar" eyebrow="Pazar" />
          <VehicleGrid listings={latest} />
        </section>

        <section className="mt-10">
          <SectionHeader title="Otomotiv haberleri" eyebrow="Gundem" action={<Link href="/news" className="text-sm font-bold text-oto-blue">Haberler</Link>} />
          <NewsGrid articles={newsArticles.slice(0, 3)} />
        </section>
      </PageContainer>
      <MobileBottomNav />
    </>
  );
}
