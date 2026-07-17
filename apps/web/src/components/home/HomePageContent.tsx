import Link from "next/link";
import type { City, HomeListing, ListingMedia, Make, Model } from "@/lib/supabase/types";
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
import { localizePath } from "@/i18n/config";
import { getDictionary } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/types";
import { HomeVehicleSearchPanel } from "./HomeVehicleSearchPanel";
import { PrimaryCategoryStrip } from "./PrimaryCategoryStrip";
import { HotListingsSection } from "./HotListingsSection";
import { VideoTeaserSection } from "./VideoTeaserSection";
import { MarketplaceVerticalsSection } from "./MarketplaceVerticalsSection";
import { PopularCitiesSection } from "./PopularCitiesSection";
import { SeoEntryLinks } from "./SeoEntryLinks";
import { HomeTrustSection } from "./HomeTrustSection";
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
  locale?: Locale;
}) {
  const dictionary = getDictionary(locale);
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
              <h1 className="mt-2 text-3xl font-black tracking-tight text-oto-text md:text-4xl">{String(dictionary.home.title)}</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-oto-muted md:text-base">
                {String(dictionary.home.subtitle)}
              </p>
            </div>
            <HomeVehicleSearchPanel makes={makes} models={models} cities={cities} listings={listings} />
          </div>
        </section>

        <PrimaryCategoryStrip locale={locale} />

        {error ? <div className="mt-6"><ErrorState message={error} /></div> : null}
        <DevQueryDebug items={debugItems} />

        <HotListingsSection listings={orderedListings} mediaByListing={mediaByListing} locale={locale} />

        <VideoTeaserSection locale={locale} />

        <MarketplaceVerticalsSection locale={locale} />

        <section className="mt-8">
          <SectionHeader
            title={String(dictionary.home.popularBrands)}
            eyebrow={String(dictionary.home.explore)}
            action={<Link href={localizePath("/search", locale)} className="text-sm font-bold text-oto-blue">{String(dictionary.common.showAll)}</Link>}
          />
          <BrandCarousel makes={makes} countsByMake={countsByMake} />
        </section>

        <PopularCitiesSection cities={cities} locale={locale} />

        <SeoEntryLinks locale={locale} />

        <section className="mt-10">
          <SectionHeader
            title={String(dictionary.home.featuredListings)}
            eyebrow={String(dictionary.home.recommendations)}
            action={<ButtonLink href={localizePath("/sell", locale)} variant="orange">{String(dictionary.common.publishListing)}</ButtonLink>}
          />
          {featured.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {featured.map((listing) => (
                <VehicleCard key={listing.listing_id} listing={listing} media={mediaByListing[listing.listing_id]} priceBadge={getPriceBadgeForListing(listing, orderedListings)} />
              ))}
            </div>
          ) : (
            <VehicleGrid listings={[]} title={String(dictionary.home.noActiveListingsTitle)} body={String(dictionary.home.noActiveListingsBody)} locale={locale} />
          )}
        </section>

        <section className="mt-10">
          <SectionHeader title={String(dictionary.home.latestListings)} eyebrow={String(dictionary.home.marketplace)} />
          <VehicleGrid listings={latest} listingMedia={listingMedia} locale={locale} />
        </section>

        <HomeTrustSection locale={locale} />

        <section className="mt-10">
          <SectionHeader
            title={String(dictionary.home.newsTitle)}
            eyebrow={String(dictionary.home.newsEyebrow)}
            action={<Link href={localizePath("/news", locale)} className="text-sm font-bold text-oto-blue">{String(dictionary.footer.news)}</Link>}
          />
          <NewsGrid articles={newsArticles.slice(0, 3)} />
        </section>

        <div id="app">
          <AppPromoSection locale={locale} />
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
