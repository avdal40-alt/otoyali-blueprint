import Link from "next/link";
import type { City, HomeListing, ListingMedia, Make, Model } from "@/lib/supabase/types";
import { tr } from "@/i18n/tr";
import { en } from "@/i18n/en";
import { newsArticles } from "@/data/news";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { BrandCarousel } from "@/components/brand/BrandCarousel";
import { VehicleGrid } from "@/components/vehicle/VehicleGrid";
import { VehicleCard } from "@/components/vehicle/VehicleCard";
import { NewsGrid } from "@/components/news/NewsGrid";
import { ButtonLink } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { DevQueryDebug } from "@/components/debug/DevQueryDebug";
import type { QueryResult } from "@/lib/queries/listings";
import { getPriceBadgeForListing } from "@/lib/market-price/analysis";
import { getListingCountByMake, sortListings } from "@/lib/search/filter-listings";
import { HomeVehicleSearchPanel } from "./HomeVehicleSearchPanel";
import { HotListingsSection } from "./HotListingsSection";
import { AkisTeaserSection } from "./AkisTeaserSection";
import { AppPromoSection } from "./AppPromoSection";

export function HomePageContent({
  listings,
  listingMedia = [],
  makes,
  models,
  cities = [],
  error,
  debugItems = [],
  locale = "tr"
}: {
  listings: HomeListing[];
  listingMedia?: ListingMedia[];
  makes: Make[];
  models: Model[];
  cities?: City[];
  error?: string | null;
  debugItems?: Array<Pick<QueryResult<unknown>, "queryName" | "count" | "error">>;
  locale?: "tr" | "en";
}) {
  const dict = locale === "en" ? en : tr;
  const orderedListings = sortListings(listings, "newest");
  const featured = orderedListings.slice(4, 7).length > 0 ? orderedListings.slice(4, 7) : orderedListings.slice(0, 3);
  const latest = orderedListings.slice(0, 6);
  const mediaByListing = groupMediaByListing(listingMedia);
  const countsByMake = getListingCountByMake(listings);

  return (
    <>
      <AppHeader />
      <PageContainer className="pt-4">
        <section className="rounded-oto border border-oto-border bg-gradient-to-br from-white via-white to-blue-50 px-4 py-5 shadow-soft md:px-6 md:py-7">
          <div className="grid gap-5 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-oto-blue">OTOYALI</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-oto-text md:text-4xl">{dict.heroTitle}</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-oto-muted md:text-base">{dict.heroSubtitle}</p>
            </div>
            <HomeVehicleSearchPanel makes={makes} models={models} cities={cities} listings={listings} />
          </div>
        </section>

        {error ? <div className="mt-6"><ErrorState message={error} /></div> : null}
        <DevQueryDebug items={debugItems} />

        <HotListingsSection listings={orderedListings} mediaByListing={mediaByListing} />

        <AkisTeaserSection />

        <section className="mt-8">
          <SectionHeader title="Popüler markalar" eyebrow="Keşfet" action={<Link href="/search" className="text-sm font-bold text-oto-blue">Tümünü gör</Link>} />
          <BrandCarousel makes={makes} countsByMake={countsByMake} />
        </section>

        <section className="mt-10">
          <SectionHeader title="Vitrin ilanları" eyebrow="Öneriler" action={<ButtonLink href="/sell" variant="orange">İlan yayınla</ButtonLink>} />
          {featured.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {featured.map((listing) => (
                <VehicleCard key={listing.listing_id} listing={listing} media={mediaByListing[listing.listing_id]} priceBadge={getPriceBadgeForListing(listing, orderedListings)} />
              ))}
            </div>
          ) : (
            <VehicleGrid listings={[]} title="Aktif ilan bulunamadı" body="Supabase verisi geldiği anda burada görünecek." />
          )}
        </section>

        <section className="mt-10">
          <SectionHeader title="En yeni ilanlar" eyebrow="Pazar" />
          <VehicleGrid listings={latest} listingMedia={listingMedia} />
        </section>

        <section className="mt-10">
          <SectionHeader title="Otomotiv haberleri" eyebrow="Gündem" action={<Link href="/news" className="text-sm font-bold text-oto-blue">Haberler</Link>} />
          <NewsGrid articles={newsArticles.slice(0, 3)} />
        </section>

        <div id="app">
          <AppPromoSection />
        </div>
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}

function groupMediaByListing(media: ListingMedia[]) {
  return media.reduce<Record<string, ListingMedia[]>>((groups, item) => {
    if (!item.listing_id) return groups;
    groups[item.listing_id] = [...(groups[item.listing_id] ?? []), item];
    return groups;
  }, {});
}
