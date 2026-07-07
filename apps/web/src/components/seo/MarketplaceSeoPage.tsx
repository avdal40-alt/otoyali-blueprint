import Link from "next/link";
import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { VehicleCard } from "@/components/vehicle/VehicleCard";
import { DevQueryDebug } from "@/components/debug/DevQueryDebug";
import { getCities } from "@/lib/queries/cities";
import { getHomeListings } from "@/lib/queries/listings";
import { getListingMediaForListings } from "@/lib/queries/media";
import { getMakes, getModels } from "@/lib/queries/makes";
import type { City, HomeListing, ListingMedia, Make, Model } from "@/lib/supabase/types";
import { citySeoSlug, makeSeoSlug, modelSeoSlug } from "@/lib/seo/slugs";
import { absoluteUrl } from "@/lib/seo/metadata";
import { defaultSearchFilters, buildSearchUrl, type ListingSearchFilters } from "@/lib/search/search-params";
import { filterListings } from "@/lib/search/filter-listings";
import { getPriceBadgeForListing } from "@/lib/market-price/analysis";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type MarketplaceSeoConfig = {
  path: string;
  h1: string;
  description: string;
  ctaLabel: string;
  filters: Partial<ListingSearchFilters>;
  breadcrumbs: BreadcrumbItem[];
  summary: Array<{ label: string; value: string }>;
  seoText: ReactNode;
};

export async function MarketplaceSeoPage({ config }: { config: MarketplaceSeoConfig }) {
  const [listingsResult, makesResult, modelsResult, citiesResult] = await Promise.all([
    getHomeListings(240),
    getMakes(),
    getModels(),
    getCities()
  ]);

  const filters: ListingSearchFilters = {
    ...defaultSearchFilters,
    ...config.filters,
    sort: config.filters.sort ?? "newest"
  };
  const filteredListings = filterListings(listingsResult.data, filters);
  const previewListings = filteredListings.slice(0, 6);
  const mediaResult = await getListingMediaForListings(previewListings.map((listing) => listing.listing_id));
  const mediaByListing = groupMediaByListing(mediaResult.data);
  const searchUrl = buildSearchUrl(config.filters);
  const pageError = listingsResult.error ?? makesResult.error ?? modelsResult.error ?? citiesResult.error ?? mediaResult.error;

  return (
    <>
      <JsonLd data={buildJsonLd(config, previewListings)} />
      <AppHeader />
      <PageContainer>
        <Breadcrumbs items={config.breadcrumbs} />
        <section className="rounded-oto border border-oto-border bg-gradient-to-br from-white via-white to-blue-50 px-5 py-7 shadow-soft md:px-7">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-oto-blue">OTOYALI Marketplace</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-oto-text md:text-4xl">{config.h1}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-oto-muted md:text-base">{config.description}</p>
            </div>
            <ButtonLink href={searchUrl} variant="orange" className="w-full md:w-auto">
              {config.ctaLabel}
            </ButtonLink>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {config.summary.map((item) => (
              <span key={`${item.label}-${item.value}`} className="rounded-full border border-oto-border bg-white px-3 py-1.5 text-xs font-black text-oto-muted">
                {item.label}: <span className="text-oto-text">{item.value}</span>
              </span>
            ))}
          </div>
        </section>

        {pageError ? <div className="mt-6"><ErrorState message={pageError} /></div> : null}
        <DevQueryDebug items={[listingsResult, mediaResult, makesResult, modelsResult, citiesResult]} />

        <section className="mt-8">
          <SectionHeader
            title="Öne çıkan ilanlar"
            eyebrow="İlan önizlemesi"
            action={<Link href={searchUrl} className="text-sm font-black text-oto-blue">Tümünü gör</Link>}
          />
          {previewListings.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {previewListings.map((listing) => (
                <VehicleCard
                  key={listing.listing_id}
                  listing={listing}
                  media={mediaByListing[listing.listing_id]}
                  priceBadge={getPriceBadgeForListing(listing, filteredListings)}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Bu kategori için aktif ilan bulunamadı"
              body="Filtreleri arama sayfasında değiştirerek güncel ilanları keşfedebilirsiniz."
              href={searchUrl}
              action="Aramada incele"
            />
          )}
        </section>

        <InternalLinks makes={makesResult.data} models={modelsResult.data} cities={citiesResult.data} currentPath={config.path} />

        <section className="mt-8 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
            <h2 className="text-lg font-black text-oto-text">{config.h1} hakkında</h2>
            <div className="mt-3 text-sm leading-7 text-oto-muted">{config.seoText}</div>
          </div>
          <div className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
            <h2 className="text-lg font-black text-oto-text">Güvenli keşif</h2>
            <div className="mt-3 grid gap-3 text-sm leading-6 text-oto-muted">
              <p>OTOYALI’de ilanları kayıt olmadan inceleyebilir, filtreleri kullanarak ihtiyacınıza uygun araçları karşılaştırabilirsiniz.</p>
              <p>Bu sayfalar yalnızca aktif ve herkese açık ilan verilerini kullanır; özel satıcı bilgileri gösterilmez.</p>
              <p>Detaylı filtreleme ve daha fazla ilan için arama sayfasına geçebilirsiniz.</p>
            </div>
          </div>
        </section>
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}

function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold text-oto-muted" aria-label="Breadcrumb">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-2">
          {item.href ? <Link href={item.href} className="hover:text-oto-blue">{item.label}</Link> : <span className="text-oto-text">{item.label}</span>}
          {index < items.length - 1 ? <span>/</span> : null}
        </span>
      ))}
    </nav>
  );
}

function InternalLinks({
  makes,
  models,
  cities,
  currentPath
}: {
  makes: Make[];
  models: Model[];
  cities: City[];
  currentPath: string;
}) {
  const categoryLinks = [
    { label: "İkinci el araba ilanları", href: "/ikinci-el-araba" },
    { label: "Sıfır km araba ilanları", href: "/sifir-km-araba" },
    { label: "Elektrikli araçlar", href: "/elektrikli-araclar" },
    { label: "Otomatik vites araçlar", href: "/otomatik-vites-araclar" },
    { label: "SUV araçlar", href: "/suv-araclar" },
    { label: "Tüm ilanlar", href: "/search" }
  ].filter((item) => item.href !== currentPath);

  const makeLinks = prioritizedMakes(makes).slice(0, 8).map((make) => ({
    label: make.make_name || "Marka",
    href: `/marka/${makeSeoSlug(make.make_name, make.make_slug)}`
  }));
  const cityLinks = prioritizedCities(cities).slice(0, 8).map((city) => ({
    label: city.city_name || "Şehir",
    href: `/sehir/${citySeoSlug(city.city_name, city.city_slug)}`
  }));
  const modelLinks = models.slice(0, 8).map((model) => ({
    label: [model.make_name, model.model_name].filter(Boolean).join(" "),
    href: `/marka/${makeSeoSlug(model.make_name)}/${modelSeoSlug(model.model_name, model.model_slug)}`
  })).filter((item) => item.label.trim() && !item.href.endsWith("/"));

  return (
    <section className="mt-8 grid gap-4 lg:grid-cols-3">
      <LinkGroup title="Popüler kategoriler" links={categoryLinks} />
      <LinkGroup title="Popüler markalar" links={makeLinks} />
      <LinkGroup title="Popüler şehirler" links={cityLinks} extraLinks={modelLinks.slice(0, 4)} />
    </section>
  );
}

function LinkGroup({
  title,
  links,
  extraLinks = []
}: {
  title: string;
  links: Array<{ label: string; href: string }>;
  extraLinks?: Array<{ label: string; href: string }>;
}) {
  const allLinks = [...links, ...extraLinks].filter((item) => item.href && item.label);

  return (
    <div className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <h2 className="text-sm font-black text-oto-text">{title}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {allLinks.map((link) => (
          <Link key={`${link.href}-${link.label}`} href={link.href} className="rounded-full bg-oto-surface px-3 py-1.5 text-xs font-black text-oto-muted transition hover:bg-blue-50 hover:text-oto-blue">
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

function buildJsonLd(config: MarketplaceSeoConfig, listings: HomeListing[]) {
  const breadcrumbItems = config.breadcrumbs.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.label,
    item: absoluteUrl(item.href ?? config.path)
  }));
  const graph: unknown[] = [
    {
      "@type": "WebPage",
      name: config.h1,
      description: config.description,
      url: absoluteUrl(config.path)
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: breadcrumbItems
    }
  ];

  if (listings.length > 0) {
    graph.push({
      "@type": "ItemList",
      itemListElement: listings.map((listing, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: listing.title || [listing.make_name, listing.model_name].filter(Boolean).join(" "),
        url: absoluteUrl(`/listing/${listing.listing_id}`)
      }))
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph
  };
}

function groupMediaByListing(media: ListingMedia[]) {
  return media.reduce<Record<string, ListingMedia[]>>((groups, item) => {
    if (!item.listing_id) return groups;
    groups[item.listing_id] = [...(groups[item.listing_id] ?? []), item];
    return groups;
  }, {});
}

function prioritizedMakes(makes: Make[]) {
  const priority = ["BMW", "Mercedes-Benz", "Audi", "Toyota", "Volkswagen", "Tesla", "Honda", "Hyundai", "BYD"];
  return [...makes].sort((a, b) => {
    const aIndex = priority.indexOf(a.make_name ?? "");
    const bIndex = priority.indexOf(b.make_name ?? "");
    if (aIndex !== -1 || bIndex !== -1) return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    return (a.make_name ?? "").localeCompare(b.make_name ?? "", "tr");
  });
}

function prioritizedCities(cities: City[]) {
  const priority = ["İstanbul", "Ankara", "İzmir", "Antalya", "Bursa", "Adana", "Konya", "Gaziantep"];
  return [...cities].sort((a, b) => {
    const aIndex = priority.indexOf(a.city_name ?? "");
    const bIndex = priority.indexOf(b.city_name ?? "");
    if (aIndex !== -1 || bIndex !== -1) return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    return (a.city_name ?? "").localeCompare(b.city_name ?? "", "tr");
  });
}
