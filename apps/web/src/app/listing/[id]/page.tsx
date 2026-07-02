import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { VehicleGallery } from "@/components/vehicle/VehicleGallery";
import { SpecChip } from "@/components/vehicle/SpecChip";
import { FavoriteButton } from "@/components/vehicle/FavoriteButton";
import { getListingDetails, getHomeListings, getHomeListingById } from "@/lib/queries/listings";
import { getListingMedia, getListingMediaByVehicleProfileId } from "@/lib/queries/media";
import { formatMileage, formatPrice, fuelLabel, transmissionLabel } from "@/lib/format";
import { DevQueryDebug } from "@/components/debug/DevQueryDebug";
import { ContactSellerButton } from "./_components/ContactSellerButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ListingDetailsPage({ params }: { params: { id: string } }) {
  const [detailsResult, mediaResult, fallbackListingResult, similarResult] = await Promise.all([
    getListingDetails(params.id),
    getListingMedia(params.id),
    getHomeListingById(params.id),
    getHomeListings(3)
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

  return (
    <>
      <AppHeader />
      <PageContainer>
        {detailsResult.error ? <ErrorState message={detailsResult.error} /> : null}
        <DevQueryDebug items={[detailsResult, mediaResult, fallbackListingResult, ...(fallbackMediaResult ? [fallbackMediaResult] : [])]} />
        {listing ? (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
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
                  {listing.price_negotiable ? <SpecChip>Pazarlik var</SpecChip> : null}
                </div>
                <section className="mt-8 rounded-oto border border-oto-border bg-white p-5">
                  <h2 className="text-lg font-bold text-oto-text">Aciklama</h2>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-oto-muted">{listing.description || "Satici aciklama eklememis."}</p>
                </section>
                <section className="mt-6 rounded-oto border border-oto-border bg-white p-5">
                  <h2 className="text-lg font-bold text-oto-text">Benzer ilanlar</h2>
                  <p className="mt-2 text-sm leading-6 text-oto-muted">Bu alan Sprint 1 sonrasi akilli oneriler icin hazir tutulur.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {similarResult.data
                      .filter((item) => item.listing_id !== listing.listing_id)
                      .slice(0, 3)
                      .map((item) => (
                        <Link key={item.listing_id} href={`/listing/${item.listing_id}`} className="rounded-full border border-oto-border px-3 py-2 text-xs font-bold text-oto-muted hover:text-oto-blue">
                          {[item.make_name, item.model_name].filter(Boolean).join(" ") || "Bilgi yok"}
                        </Link>
                      ))}
                  </div>
                </section>
              </div>
            </div>
            <aside className="h-fit rounded-oto border border-oto-border bg-white p-5 shadow-soft lg:sticky lg:top-24">
              <h2 className="text-lg font-bold text-oto-text">Satici</h2>
              <p className="mt-2 text-sm leading-6 text-oto-muted">Satici bilgileri gizlilik icin sinirli tutulur. Iletisim icin giris yapmaniz gerekir.</p>
              <div className="mt-4 grid gap-3">
                <ContactSellerButton />
                <ButtonLink href={`/listing/${listing.listing_id}`} variant="secondary" className="w-full">
                  Paylas
                </ButtonLink>
              </div>
              <p className="mt-5 rounded-md bg-oto-surface p-3 text-sm font-semibold leading-6 text-oto-muted">
                OTOYALI helps you buy and sell vehicles safely.
              </p>
            </aside>
          </div>
        ) : null}
      </PageContainer>
      <MobileBottomNav />
    </>
  );
}
