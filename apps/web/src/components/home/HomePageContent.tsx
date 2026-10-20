import Link from "next/link";
import type { City, HomeListing, Make, Model } from "@/lib/supabase/types";
import { getNewsArticles } from "@/data/news";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { BrandCarousel } from "@/components/brand/BrandCarousel";
import { VehicleGrid } from "@/components/vehicle/VehicleGrid";
import { NewsGrid } from "@/components/news/NewsGrid";
import { HomeMarketplaceAction } from "./HomeMarketplaceAction";
import { ErrorState } from "@/components/ui/States";
import { localizePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/types";
import { HomeVehicleSearchPanel } from "./HomeVehicleSearchPanel";

export function HomePageContent({
  listings,
  makes,
  models,
  cities = [],
  error,
  locale = "tr"
}: {
  listings: HomeListing[];
  makes: Make[];
  models: Model[];
  cities?: City[];
  error?: string | null;
  locale?: Locale;
}) {
  const dictionary = getDictionary(locale);

  return (
    <>
      <AppHeader />
      <PageContainer className="pt-6 md:pt-8">
        <HomeVehicleSearchPanel makes={makes} models={models} cities={cities} listings={listings} />

        {error ? <div className="mt-6"><ErrorState message={String(dictionary.home.loadError)} /></div> : null}

        <section className="mt-10">
          <SectionHeader
            title={String(dictionary.home.browseByMake)}
            action={<Link href={localizePath("/search", locale)} className="text-sm font-bold text-oto-blue">{String(dictionary.common.showAll)}</Link>}
          />
          <BrandCarousel makes={makes} locale={locale} />
        </section>

        <section className="mt-10">
          <SectionHeader
            title={String(dictionary.home.latestListings)}
            action={<Link href={localizePath("/search", locale)} className="text-sm font-bold text-oto-blue">{String(dictionary.common.showAll)}</Link>}
          />
          <VehicleGrid listings={listings} title={String(dictionary.home.noActiveListingsTitle)} body={String(dictionary.home.noActiveListingsBody)} locale={locale} variant="home" />
        </section>

        <HomeMarketplaceAction
          locale={locale}
          sellTitle={String(dictionary.home.sellCtaTitle)}
          sellBody={String(dictionary.home.sellCtaBody)}
          sellerLabel={String(dictionary.common.publishListing)}
          adminLabel={String(dictionary.common.adminPanel)}
          adminBody={String(dictionary.home.adminCtaBody)}
        />

        <section className="mt-10">
          <SectionHeader
            title={String(dictionary.home.newsTitle)}
            action={<Link href={localizePath("/news", locale)} className="text-sm font-bold text-oto-blue">{String(dictionary.footer.news)}</Link>}
          />
          <NewsGrid articles={getNewsArticles({ countryCode: "KZ", limit: 3 })} />
        </section>
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
