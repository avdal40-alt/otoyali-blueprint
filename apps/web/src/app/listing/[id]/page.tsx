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
import { PriceIntelligenceCard } from "@/components/vehicle/PriceIntelligenceCard";
import { SpecChip } from "@/components/vehicle/SpecChip";
import { TrustStatusCard } from "@/components/vehicle/TrustStatusCard";
import { FavoriteButton } from "@/components/vehicle/FavoriteButton";
import { VehicleCard } from "@/components/vehicle/VehicleCard";
import { getListingDetails, getHomeListings, getHomeListingById } from "@/lib/queries/listings";
import { getListingMedia, getListingMediaByVehicleProfileId } from "@/lib/queries/media";
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
import { formatListingPurposePrice, listingPurposeLabel, vehicleCategoryLabel, vehicleMarketplaceV2Copy } from "@/lib/marketplace/v2-contract";
import { isAiFeatureEnabled } from "@/features/ai/feature-registry";
import { DevQueryDebug } from "@/components/debug/DevQueryDebug";
import { getRequestLocale } from "@/i18n/server";
import { localizePath } from "@/i18n/config";
import { ContactSellerButton } from "./_components/ContactSellerButton";
import { StartConversationButton } from "./_components/StartConversationButton";
import { ShareListingButton } from "./_components/ShareListingButton";
import { ReportListingButton } from "./_components/ReportListingButton";
import { ListingViewEvent } from "./_components/ListingViewEvent";
import { getListingReviewTarget, reviewGenerationPath } from "@/lib/queries/reviews";
import { getListingDetailCopy } from "./listing-detail-copy";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ListingDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const locale = await getRequestLocale();
  const copy = getListingDetailCopy(locale);
  const priceIntelligenceEnabled = isAiFeatureEnabled("ai_price");
  const vinTrustEnabled = isAiFeatureEnabled("ai_vin");
  const resolvedParams = await params;
  const [detailsResult, mediaResult, fallbackListingResult, similarResult, videosResult, reviewTargetResult] = await Promise.all([
    getListingDetails(resolvedParams.id),
    getListingMedia(resolvedParams.id),
    getHomeListingById(resolvedParams.id),
    getHomeListings(12),
    getListingVideos(resolvedParams.id, 3),
    getListingReviewTarget(resolvedParams.id)
  ]);

  if (!detailsResult.data && !detailsResult.error) {
    notFound();
  }

  const listing = detailsResult.data;
  const title = listing?.title?.trim() || copy.noInfo;
  const city = cityLabel(listing?.city, locale);
  const fallbackCoverImage = fallbackListingResult.data?.cover_image_url;
  const fallbackMediaResult =
    mediaResult.data.length === 0 && listing?.vehicle_profile_id
      ? await getListingMediaByVehicleProfileId(listing.vehicle_profile_id)
      : null;
  const mediaRows = mediaResult.data.length > 0 ? mediaResult.data : fallbackMediaResult?.data ?? [];
  const similarListings = similarResult.data
    .filter((item) => item.listing_id !== listing?.listing_id)
    .sort((left, right) => Number(right.make_name === listing?.make_name) - Number(left.make_name === listing?.make_name) || Number(right.model_name === listing?.model_name) - Number(left.model_name === listing?.model_name))
    .slice(0, 3);

  return (
    <>
      <AppHeader />
      {listing ? <ListingViewEvent listingId={listing.listing_id} /> : null}
      <PageContainer className={listing ? "pb-40 md:pb-24" : undefined}>
        {detailsResult.error ? <ErrorState message={detailsResult.error} /> : null}
        <DevQueryDebug items={[detailsResult, mediaResult, fallbackListingResult, videosResult, ...(fallbackMediaResult ? [fallbackMediaResult] : [])]} />
        {listing ? (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div>
              <VehicleGallery media={mediaRows} title={title} fallbackImageUrl={fallbackCoverImage} />
              <div className="mt-6">
                {reviewTargetResult.data ? <Link href={reviewGenerationPath(reviewTargetResult.data)} className="mb-4 inline-block text-sm font-semibold text-oto-primary underline">{copy.reviewOwners}</Link> : null}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{city}</Badge>
                      {listing.condition ? <Badge>{conditionLabel(listing.condition, locale)}</Badge> : null}
                      {listing.vehicle_category && listing.vehicle_category !== "passenger_car" ? <Badge>{vehicleCategoryLabel(listing.vehicle_category, locale)}</Badge> : null}
                      {listing.listing_purpose === "rent" ? <Badge>{listingPurposeLabel(listing.listing_purpose, locale)}</Badge> : null}
                      {listing.seller_type ? <Badge>{sellerTypeLabel(listing.seller_type, locale)}</Badge> : null}
                    </div>
                    <h1 className="mt-3 text-3xl font-black tracking-tight text-oto-text">{title}</h1>
                    <p className="mt-3 text-3xl font-black text-oto-text">{formatListingPurposePrice(listing, locale)}</p>
                  </div>
                  <FavoriteButton listingId={listing.listing_id} />
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <SpecChip>{listing.year ?? copy.noInfo}</SpecChip>
                  {listing.vehicle_category !== "trailer" ? <SpecChip>{formatMileage(listing.mileage_km, locale)}</SpecChip> : null}
                  {listing.vehicle_category !== "trailer" ? <SpecChip>{fuelLabel(listing.fuel_type, locale)}</SpecChip> : null}
                  {listing.vehicle_category !== "trailer" ? <SpecChip>{transmissionLabel(listing.transmission, locale)}</SpecChip> : null}
                  {listing.price_negotiable ? <SpecChip>{copy.negotiable}</SpecChip> : null}
                </div>
                <section className="mt-6 rounded-oto border border-oto-border bg-white p-5 shadow-soft">
                  <h2 className="text-lg font-bold text-oto-text">{copy.vehicleSpecs}</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      [copy.make, listing.make_name || copy.noInfo],
                      [copy.model, listing.model_name || copy.noInfo],
                      [copy.year, listing.year ?? copy.noInfo],
                      ...(listing.vehicle_category !== "trailer" ? [
                        [copy.mileage, formatMileage(listing.mileage_km, locale)],
                        [copy.fuel, fuelLabel(listing.fuel_type, locale)],
                        [copy.transmission, transmissionLabel(listing.transmission, locale)]
                      ] : []),
                      ...(listing.vehicle_category === "truck" ? [
                        [vehicleMarketplaceV2Copy("truckBodyType", locale), listing.truck_body_type || copy.noInfo],
                        [vehicleMarketplaceV2Copy("payloadCapacity", locale), listing.payload_capacity_kg ? `${listing.payload_capacity_kg} ${vehicleMarketplaceV2Copy("kilograms", locale)}` : copy.noInfo],
                        [vehicleMarketplaceV2Copy("grossWeight", locale), listing.gross_weight_kg ? `${listing.gross_weight_kg} ${vehicleMarketplaceV2Copy("kilograms", locale)}` : copy.noInfo],
                        [vehicleMarketplaceV2Copy("axleCount", locale), listing.axle_count ?? copy.noInfo]
                      ] : []),
                      ...(listing.vehicle_category === "bus" ? [
                        [vehicleMarketplaceV2Copy("busType", locale), listing.bus_type || copy.noInfo],
                        [vehicleMarketplaceV2Copy("seatCount", locale), listing.seat_count ?? copy.noInfo]
                      ] : []),
                      ...(listing.vehicle_category === "trailer" ? [
                        [vehicleMarketplaceV2Copy("trailerType", locale), listing.trailer_type || copy.noInfo],
                        [vehicleMarketplaceV2Copy("payloadCapacity", locale), listing.payload_capacity_kg ? `${listing.payload_capacity_kg} ${vehicleMarketplaceV2Copy("kilograms", locale)}` : copy.noInfo],
                        [vehicleMarketplaceV2Copy("grossWeight", locale), listing.gross_weight_kg ? `${listing.gross_weight_kg} ${vehicleMarketplaceV2Copy("kilograms", locale)}` : copy.noInfo],
                        [vehicleMarketplaceV2Copy("axleCount", locale), listing.axle_count ?? copy.noInfo]
                      ] : []),
                      ...(listing.vehicle_category === "special_machinery" ? [
                        [vehicleMarketplaceV2Copy("machineryType", locale), listing.machinery_type || copy.noInfo],
                        [vehicleMarketplaceV2Copy("operatingHours", locale), listing.operating_hours !== null && listing.operating_hours !== undefined ? `${listing.operating_hours} ${vehicleMarketplaceV2Copy("hours", locale)}` : copy.noInfo]
                      ] : []),
                      [copy.bodyType, listing.body_type ? bodyTypeLabel(listing.body_type, locale) : copy.noInfo],
                      [copy.driveType, listing.drive_type ? driveTypeLabel(listing.drive_type, locale) : copy.noInfo],
                      [copy.color, listing.color ? colorLabel(listing.color, locale) : copy.noInfo],
                      [copy.engineVolume, listing.engine_volume_l ? `${listing.engine_volume_l} L` : copy.noInfo],
                      [copy.damageState, listing.damage_state ? damageStateLabel(listing.damage_state, locale) : copy.noInfo],
                      [copy.ownerCount, listing.owner_count ?? copy.noInfo],
                      [copy.city, city],
                      [copy.publishedAt, formatDate(listing.published_at, locale) || copy.noInfo]
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-md bg-oto-surface p-3">
                        <p className="text-xs font-bold uppercase tracking-wide text-oto-muted">{label}</p>
                        <p className="mt-1 text-sm font-black text-oto-text">{value}</p>
                      </div>
                    ))}
                  </div>
                </section>
                {listing.listing_purpose === "rent" ? (
                  <section className="mt-6 rounded-oto border border-oto-border bg-white p-5 shadow-soft">
                    <h2 className="text-lg font-bold text-oto-text">{listingPurposeLabel(listing.listing_purpose, locale)}</h2>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <RentalTerm label={locale === "kk" ? "Күндік баға" : locale === "en" ? "Daily price" : locale === "zh-CN" ? "每日价格" : "Цена в день"} value={formatListingPurposePrice(listing, locale)} />
                      {listing.rental_price_per_month ? <RentalTerm label={locale === "kk" ? "Айлық баға" : locale === "en" ? "Monthly price" : locale === "zh-CN" ? "每月价格" : "Цена в месяц"} value={formatPrice(listing.rental_price_per_month, listing.currency, locale)} /> : null}
                      {listing.minimum_rental_days ? <RentalTerm label={locale === "kk" ? "Ең аз мерзім" : locale === "en" ? "Minimum term" : locale === "zh-CN" ? "最短租期" : "Минимальный срок"} value={`${listing.minimum_rental_days} ${locale === "kk" ? "күн" : locale === "en" ? "days" : locale === "zh-CN" ? "天" : "дн."}`} /> : null}
                      {listing.security_deposit_amount !== null && listing.security_deposit_amount !== undefined ? <RentalTerm label={locale === "kk" ? "Депозит (сатушы ақпараты)" : locale === "en" ? "Deposit (seller information)" : locale === "zh-CN" ? "押金（卖家信息）" : "Залог (информация продавца)"} value={formatPrice(listing.security_deposit_amount, listing.currency, locale)} /> : null}
                      {listing.with_driver_or_operator !== null && listing.with_driver_or_operator !== undefined ? <RentalTerm label={locale === "kk" ? "Жүргізуші / оператор" : locale === "en" ? "Driver / operator" : locale === "zh-CN" ? "司机/操作员" : "Водитель / оператор"} value={listing.with_driver_or_operator ? (locale === "en" ? "Included" : locale === "kk" ? "Бар" : locale === "zh-CN" ? "提供" : "Предоставляется") : (locale === "en" ? "Not included" : locale === "kk" ? "Жоқ" : locale === "zh-CN" ? "不提供" : "Не предоставляется")} /> : null}
                    </div>
                    <p className="mt-4 text-xs leading-5 text-oto-muted">{locale === "en" ? "Jolmod does not collect or hold rental payments or deposits." : locale === "kk" ? "Jolmod жалдау төлемін немесе депозитті жинамайды және сақтамайды." : locale === "zh-CN" ? "Jolmod 不收取或保管租金和押金。" : "Jolmod не принимает и не хранит арендные платежи или залог."}</p>
                  </section>
                ) : null}
                {priceIntelligenceEnabled || vinTrustEnabled ? (
                  <div className="mt-6 grid items-stretch gap-6 xl:grid-cols-2">
                    {priceIntelligenceEnabled ? <PriceIntelligenceCard listingId={listing.listing_id} /> : null}
                    {vinTrustEnabled ? <TrustStatusCard listingId={listing.listing_id} /> : null}
                  </div>
                ) : null}
                {videosResult.data.length > 0 ? (
                  <section className="mt-6 rounded-oto border border-oto-border bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-bold text-oto-text">{copy.videos}</h2>
                        <p className="mt-1 text-sm leading-6 text-oto-muted">{copy.videoDescription}</p>
                      </div>
                      <ButtonLink href={localizePath(`/video?listing=${listing.listing_id}`, locale)} variant="secondary">
                        {copy.watchVideo}
                      </ButtonLink>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {videosResult.data.map((video) => (
                        <Link
                          key={video.video_id}
                          href={localizePath(`/video?listing=${listing.listing_id}`, locale)}
                          className="group overflow-hidden rounded-md border border-oto-border bg-oto-surface transition hover:border-oto-blue"
                        >
                          <div className="aspect-[9/16] bg-black">
                            <SafeImage src={video.poster_url || video.thumbnail_url || video.cover_image_url} alt={video.title || title} />
                          </div>
                          <div className="p-3">
                            <p className="line-clamp-2 text-sm font-black text-oto-text">{video.title || copy.vehicleVideo}</p>
                            <p className="mt-1 text-xs font-bold text-oto-blue">{copy.openVideo}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                ) : null}
                <section className="mt-8 rounded-oto border border-oto-border bg-white p-5">
                  <h2 className="text-lg font-bold text-oto-text">{copy.description}</h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-oto-muted">{listing.description || copy.noDescription}</p>
                </section>
                <section className="mt-6 rounded-oto border border-oto-border bg-white p-5">
                  <h2 className="text-lg font-bold text-oto-text">{copy.similarListings}</h2>
                  {similarListings.length > 0 ? (
                    <div className="mt-4 grid gap-4 md:grid-cols-3">
                      {similarListings.map((item) => (
                        <VehicleCard key={item.listing_id} listing={item} compact locale={locale} />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-oto-muted">{copy.similarEmpty}</p>
                  )}
                </section>
              </div>
            </div>
            <aside className="h-fit rounded-oto border border-oto-border bg-white p-5 shadow-soft lg:sticky lg:top-24">
              <h2 className="text-lg font-bold text-oto-text">{copy.seller}</h2>
              <div className="mt-3 rounded-md bg-oto-surface p-3">
                <p className="text-sm font-black text-oto-text">{listing.seller_display_name || copy.defaultSeller}</p>
                <p className="mt-1 text-xs font-bold text-oto-muted">{sellerTypeLabel(listing.seller_type, locale)}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-oto-muted">{copy.sellerLoginCopy}</p>
              <div className="mt-4 grid gap-3">
                <ContactSellerButton listingId={listing.listing_id} />
                <StartConversationButton listingId={listing.listing_id} />
                <ShareListingButton title={title} />
              </div>
              <p className="mt-5 rounded-md bg-oto-surface p-3 text-sm font-semibold leading-6 text-oto-muted">
                {copy.safetyCopy}
              </p>
              <ReportListingButton listingId={listing.listing_id} />
              <div className="mt-3 grid gap-2 rounded-md border border-oto-border bg-white p-3 text-sm font-bold">
                <Link href={localizePath("/listing-rules", locale)} className="text-oto-blue hover:underline">
                  {copy.listingRules}
                </Link>
                <Link href={localizePath("/safety", locale)} className="text-oto-blue hover:underline">
                  {copy.safeShopping}
                </Link>
                <Link href={localizePath("/trust", locale)} className="text-oto-muted hover:text-oto-blue">
                  {copy.safeShopping}
                </Link>
              </div>
            </aside>
          </div>
        ) : null}
      </PageContainer>
      {listing ? (
        <div className="fixed inset-x-0 bottom-16 z-40 border-t border-oto-border bg-white/95 p-3 shadow-oto backdrop-blur md:hidden">
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <ContactSellerButton listingId={listing.listing_id} />
            <StartConversationButton listingId={listing.listing_id} />
          </div>
        </div>
      ) : null}
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}

function RentalTerm({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-oto-surface p-3"><p className="text-xs font-bold uppercase tracking-wide text-oto-muted">{label}</p><p className="mt-1 text-sm font-black text-oto-text">{value}</p></div>;
}
