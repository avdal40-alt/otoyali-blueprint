import { notFound } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { SafeImage } from "@/components/ui/SafeImage";
import { VehicleGallery } from "@/components/vehicle/VehicleGallery";
import { MarketPriceAnalysis } from "@/components/vehicle/MarketPriceAnalysis";
import { SpecChip } from "@/components/vehicle/SpecChip";
import { VehicleTrustReportCard } from "@/components/vehicle/VehicleTrustReportCard";
import { FavoriteButton } from "@/components/vehicle/FavoriteButton";
import { VehicleCard } from "@/components/vehicle/VehicleCard";
import type { ListingMedia } from "@/lib/supabase/types";
import { getListingDetails, getHomeListings, getHomeListingById } from "@/lib/queries/listings";
import { getListingMedia, getListingMediaByVehicleProfileId, getListingMediaForListings } from "@/lib/queries/media";
import { getListingVideos } from "@/lib/queries/videos";
import {
  bodyTypeLabel,
  cityLabel,
  colorLabel,
  conditionLabel,
  damageStateLabel,
  driveTypeLabel,
  formatDate,
  formatMileage,
  formatPrice,
  fuelLabel,
  sellerTypeLabel,
  transmissionLabel
} from "@/lib/format";
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
    getHomeListings(12)
  ]);
  const videosResult = await getListingVideos(params.id, 3);

  if (!detailsResult.data && !detailsResult.error) {
    notFound();
  }

  const listing = detailsResult.data;
  const title = listing?.title?.trim() || "Bilgi yok";
  const city = cityLabel(listing?.city);
  const fallbackCoverImage = fallbackListingResult.data?.cover_image_url;
  const fallbackMediaResult =
    mediaResult.data.length === 0 && listing?.vehicle_profile_id
      ? await getListingMediaByVehicleProfileId(listing.vehicle_profile_id)
      : null;
  const mediaRows = mediaResult.data.length > 0 ? mediaResult.data : fallbackMediaResult?.data ?? [];
  const similarListings = similarResult.data.filter((item) => item.listing_id !== listing?.listing_id).slice(0, 3);
  const similarMediaResult = await getListingMediaForListings(similarListings.map((item) => item.listing_id));
  const similarMediaByListing = groupMediaByListing(similarMediaResult.data);

  return (
    <>
      <AppHeader />
      <PageContainer className={listing ? "pb-40 md:pb-24" : undefined}>
        {detailsResult.error ? <ErrorState message={detailsResult.error} /> : null}
        <DevQueryDebug items={[detailsResult, mediaResult, fallbackListingResult, videosResult, similarMediaResult, ...(fallbackMediaResult ? [fallbackMediaResult] : [])]} />
        {listing ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <VehicleGallery media={mediaRows} title={title} fallbackImageUrl={fallbackCoverImage} />
              <div className="mt-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{city}</Badge>
                      {listing.condition ? <Badge>{conditionLabel(listing.condition)}</Badge> : null}
                      {listing.seller_type ? <Badge>{sellerTypeLabel(listing.seller_type)}</Badge> : null}
                    </div>
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
                      ["Kasa tipi", listing.body_type ? bodyTypeLabel(listing.body_type) : "Bilgi yok"],
                      ["Çekiş", listing.drive_type ? driveTypeLabel(listing.drive_type) : "Bilgi yok"],
                      ["Renk", listing.color ? colorLabel(listing.color) : "Bilgi yok"],
                      ["Motor hacmi", listing.engine_volume_l ? `${listing.engine_volume_l} L` : "Bilgi yok"],
                      ["Hasar durumu", listing.damage_state ? damageStateLabel(listing.damage_state) : "Bilgi yok"],
                      ["Sahip sayısı", listing.owner_count ?? "Bilgi yok"],
                      ["Şehir", city],
                      ["Yayın tarihi", formatDate(listing.published_at) || "Bilgi yok"]
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-md bg-oto-surface p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-oto-muted">{label}</p>
                        <p className="mt-1 text-sm font-black text-oto-text">{value}</p>
                      </div>
                    ))}
                  </div>
                </section>
                <div className="mt-6 grid items-stretch gap-6 xl:grid-cols-2">
                  <MarketPriceAnalysis listing={listing} comparables={similarResult.data} />
                  <VehicleTrustReportCard />
                </div>
                {videosResult.data.length > 0 ? (
                  <section className="mt-6 rounded-oto border border-oto-border bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-oto-text">Araç videoları</h2>
                        <p className="mt-1 text-sm leading-6 text-oto-muted">Satıcının kısa araç tanıtımlarını Akış içinde izleyin.</p>
                      </div>
                      <ButtonLink href={`/akis?listing=${listing.listing_id}`} variant="secondary">
                        Akışta izle
                      </ButtonLink>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {videosResult.data.map((video) => (
                        <Link
                          key={video.video_id}
                          href={`/akis?listing=${listing.listing_id}`}
                          className="group overflow-hidden rounded-md border border-oto-border bg-oto-surface transition hover:border-oto-blue"
                        >
                          <div className="aspect-[9/16] bg-black">
                            <SafeImage src={video.thumbnail_url || video.cover_image_url} alt={video.title || title} />
                          </div>
                          <div className="p-3">
                            <p className="line-clamp-2 text-sm font-black text-oto-text">{video.title || "Araç videosu"}</p>
                            <p className="mt-1 text-xs font-bold text-oto-blue">Videoyu aç</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : null}
                <section className="mt-8 rounded-oto border border-oto-border bg-white p-5">
                  <h2 className="text-lg font-bold text-oto-text">Açıklama</h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-oto-muted">{listing.description || "Satıcı açıklama eklememiş."}</p>
                </section>
                <section className="mt-6 rounded-oto border border-oto-border bg-white p-5">
                  <h2 className="text-lg font-bold text-oto-text">Benzer ilanlar</h2>
                  {similarListings.length > 0 ? (
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      {similarListings.map((item) => (
                        <VehicleCard key={item.listing_id} listing={item} media={similarMediaByListing[item.listing_id]} compact priceBadge={getPriceBadgeForListing(item, similarResult.data)} />
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
              <div className="mt-3 rounded-md bg-oto-surface p-3">
                <p className="text-sm font-black text-oto-text">{listing.seller_display_name || "OTOYALI satıcısı"}</p>
                <p className="mt-1 text-xs font-bold text-oto-muted">{sellerTypeLabel(listing.seller_type)}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-oto-muted">Satıcıyla güvenli şekilde iletişime geçmek için giriş yapın.</p>
              <div className="mt-4 grid gap-3">
                <ContactSellerButton />
                <Button type="button" variant="secondary" disabled>Mesaj yaz · Yakında</Button>
                <ShareListingButton title={title} />
              </div>
              <p className="mt-5 rounded-md bg-oto-surface p-3 text-sm font-semibold leading-6 text-oto-muted">
                OTOYALI, araç alım satımını daha güvenli ve kolay hale getirir.
              </p>
            </aside>
          </div>
        ) : null}
      </PageContainer>
      {listing ? (
        <div className="fixed inset-x-0 bottom-16 z-40 border-t border-oto-border bg-white/95 p-3 shadow-oto backdrop-blur md:hidden">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <ContactSellerButton />
            <Button type="button" variant="secondary" disabled>Mesaj yaz</Button>
          </div>
        </div>
      ) : null}
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
