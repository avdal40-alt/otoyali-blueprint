import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { ErrorState } from "@/components/ui/States";
import { VehicleGallery } from "@/components/vehicle/VehicleGallery";
import { MarketPriceAnalysis } from "@/components/vehicle/MarketPriceAnalysis";
import { SpecChip } from "@/components/vehicle/SpecChip";
import { VehicleTrustReportCard } from "@/components/vehicle/VehicleTrustReportCard";
import { FavoriteButton } from "@/components/vehicle/FavoriteButton";
import { VehicleCard } from "@/components/vehicle/VehicleCard";
import { getListingDetails, getHomeListings, getHomeListingById } from "@/lib/queries/listings";
import { getListingMedia, getListingMediaByVehicleProfileId } from "@/lib/queries/media";
import { formatDate, formatMileage, formatPrice, fuelLabel, transmissionLabel } from "@/lib/format";
import { getPriceBadgeForListing } from "@/lib/market-price/analysis";
import { DevQueryDebug } from "@/components/debug/DevQueryDebug";
import { ContactSellerButton } from "./_components/ContactSellerButton";
import { ShareListingButton } from "./_components/ShareListingButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ListingDetailsPage({ params }: { params: { id: string } }) {
  const [detailsResult, mediaResult, fallbackListingResult, similarResult] = await Promise.all([
    getListingDetails(params.id),
    getListingMedia(params.id),
    getHomeListingById(params.id),
    getHomeListings()
  ]);

  if (!detailsResult.data && !detailsResult.error) {
    notFound();
  }

  const listing = detailsResult.data;
  const title = listing?.title?.trim() || "Bilgi yok";
  const city = listing?.city?.trim() || "Konum belirtilmedi";
  const fallbackCoverImage = fallbackListingResult.data?.cover_image_url;
  const fallbackMediaResult =
    mediaResult.data.length === 0 && listing?.vehicle_profile_id
      ? await getListingMediaByVehicleProfileId(listing.vehicle_profile_id)
      : null;
  const mediaRows = mediaResult.data.length > 0 ? mediaResult.data : fallbackMediaResult?.data ?? [];
  const similarListings = similarResult.data.filter((item) => item.listing_id !== listing?.listing_id).slice(0, 3);

  return (
    <>
      <AppHeader />
      <PageContainer>
        {detailsResult.error ? <ErrorState message={detailsResult.error} /> : null}
        <DevQueryDebug items={[detailsResult, mediaResult, fallbackListingResult, ...(fallbackMediaResult ? [fallbackMediaResult] : [])]} />
        {listing ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <VehicleGallery media={mediaRows} title={title} fallbackImageUrl={fallbackCoverImage} />
              <div className="mt-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <Badge>{city}</Badge>
                    <h1 className="mt-3 text-3xl font-black tracking-tight text-oto-text">{title}</h1>
                    <p className="mt-3 text-3xl font-black text-oto-text">{formatPrice(listing.price_amount, listing.currency)}</p>
                  </div>
                  <FavoriteButton listingId={listing.listing_id} />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <SpecChip>{listing.year ?? "Bilgi yok"}</SpecChip>
                  <SpecChip>{formatMileage(listing.mileage_km)}</SpecChip>
                  <SpecChip>{fuelLabel(listing.fuel_type)}</SpecChip>
                  <SpecChip>{transmissionLabel(listing.transmission)}</SpecChip>
                  {listing.price_negotiable ? <SpecChip>Pazarlık var</SpecChip> : null}
                </div>
                <section className="mt-6 rounded-oto border border-oto-border bg-white p-5 shadow-soft">
                  <h2 className="text-lg font-bold text-oto-text">Araç özellikleri</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      ["Marka", listing.make_name || "Bilgi yok"],
                      ["Model", listing.model_name || "Bilgi yok"],
                      ["Yıl", listing.year ?? "Bilgi yok"],
                      ["Kilometre", formatMileage(listing.mileage_km)],
                      ["Yakıt", fuelLabel(listing.fuel_type)],
                      ["Vites", transmissionLabel(listing.transmission)],
                      ["Şehir", city],
                      ["Yayin tarihi", formatDate(listing.published_at) || "Bilgi yok"]
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-md bg-oto-surface p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-oto-muted">{label}</p>
                        <p className="mt-1 text-sm font-black text-oto-text">{value}</p>
                      </div>
                    ))}
                  </div>
                </section>
                <div className="mt-6 grid gap-6 xl:grid-cols-2">
                  <MarketPriceAnalysis listing={listing} comparables={similarResult.data} />
                  <VehicleTrustReportCard />
                </div>
                <section className="mt-8 rounded-oto border border-oto-border bg-white p-5">
                  <h2 className="text-lg font-bold text-oto-text">Açıklama</h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-oto-muted">{listing.description || "Satıcı açıklama eklememiş."}</p>
                </section>
                <section className="mt-6 rounded-oto border border-oto-border bg-white p-5">
                  <h2 className="text-lg font-bold text-oto-text">Benzer ilanlar</h2>
                  {similarListings.length > 0 ? (
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      {similarListings.map((item) => (
                        <VehicleCard key={item.listing_id} listing={item} compact priceBadge={getPriceBadgeForListing(item, similarResult.data)} />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-oto-muted">Benzer ilanlar aktif veri arttıkça burada görünecek.</p>
                  )}
                </section>
              </div>
            </div>
            <aside className="h-fit rounded-oto border border-oto-border bg-white p-5 shadow-soft lg:sticky lg:top-24">
              <h2 className="text-lg font-bold text-oto-text">Satıcı</h2>
              <p className="mt-2 text-sm leading-6 text-oto-muted">Satıcı bilgileri gizlilik için sınırlı tutulur. İletişim için giriş yapmanız gerekir.</p>
              <div className="mt-4 grid gap-3">
                <ContactSellerButton />
                <ShareListingButton title={title} />
              </div>
              <p className="mt-5 rounded-md bg-oto-surface p-3 text-sm font-semibold leading-6 text-oto-muted">
                OTOYALI, araç alım satımını daha güvenli ve kolay hale getirir.
              </p>
            </aside>
          </div>
        ) : null}
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
