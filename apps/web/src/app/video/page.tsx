import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { FavoriteButton } from "@/components/vehicle/FavoriteButton";
import { DevQueryDebug } from "@/components/debug/DevQueryDebug";
import { getVideoFeed } from "@/lib/queries/videos";
import type { OtoyaliVideo } from "@/lib/supabase/types";
import { cityLabel, formatMileage, formatPrice, fuelLabel, sellerTypeLabel } from "@/lib/format";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/i18n/server";
import { localizePath } from "@/i18n/config";
import type { Locale } from "@/i18n/types";
import { VideoShareButton } from "./_components/VideoShareButton";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function VideoPage({
  searchParams
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const locale = getRequestLocale();
  const dictionary = getDictionary(locale);
  const listingId = singleValue(searchParams.listing);
  const videosResult = await getVideoFeed({ listingId, limit: 6 });
  const videos = videosResult.data.filter((video) => Boolean(video.video_url));

  return (
    <>
      <AppHeader />
      <PageContainer className="pb-28">
        <section className="rounded-oto border border-oto-border bg-gradient-to-br from-[#061A40] via-[#0B2C6A] to-[#0C7DF2] px-5 py-7 text-white shadow-oto md:px-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-cyan-100">
                {String(dictionary.video.label)}
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">{String(dictionary.video.title)}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50 md:text-base">
                {String(dictionary.video.subtitle)}
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                {String(dictionary.video.body)}
              </p>
            </div>
            <ButtonLink href={localizePath("/sell", locale)} variant="orange" className="w-full md:w-auto">
              {String(dictionary.common.publishListing)}
            </ButtonLink>
          </div>
        </section>

        {videosResult.error ? <div className="mt-6"><ErrorState message={videosResult.error} /></div> : null}
        <DevQueryDebug items={[videosResult]} />

        {videos.length > 0 ? (
          <section className="mx-auto mt-8 grid max-w-5xl gap-6 lg:grid-cols-[minmax(320px,460px)_1fr]">
            <div className="grid gap-6 lg:col-start-1">
              {videos.map((video) => (
                <VideoCard key={video.video_id} video={video} locale={locale} />
              ))}
            </div>
            <aside className="hidden h-fit rounded-oto border border-oto-border bg-white p-5 shadow-soft lg:sticky lg:top-24 lg:block">
              <h2 className="text-lg font-black text-oto-text">{String(dictionary.video.label)}</h2>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-oto-muted">
                <p>{String(dictionary.video.approvedVideos)}</p>
                <p>{String(dictionary.video.moderationCopy)}</p>
                <p>{String(dictionary.video.performanceCopy)}</p>
              </div>
            </aside>
          </section>
        ) : (
          <div className="mt-8">
            <EmptyState
              title={String(dictionary.video.emptyTitle)}
              body={String(dictionary.video.emptyBody)}
              href={localizePath("/sell", locale)}
              action={String(dictionary.common.publishListing)}
            />
          </div>
        )}
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}

function VideoCard({ video, locale }: { video: OtoyaliVideo; locale: Locale }) {
  const dictionary = getDictionary(locale);
  const title = video.title?.trim() || video.listing_title?.trim() || String(dictionary.video.vehicleVideo);
  const poster = video.poster_url || video.thumbnail_url || video.cover_image_url || undefined;
  const details = [
    video.year ? String(video.year) : null,
    video.mileage_km !== null && video.mileage_km !== undefined ? formatMileage(video.mileage_km, locale) : null,
    video.fuel_type ? fuelLabel(video.fuel_type, locale) : null,
    video.city ? cityLabel(video.city, locale) : null
  ].filter(Boolean);

  return (
    <article className="overflow-hidden rounded-oto border border-oto-border bg-white shadow-oto">
      <div className="relative bg-black">
        <video
          className="aspect-[9/16] w-full bg-black object-contain"
          controls
          muted
          playsInline
          preload="none"
          poster={poster}
          src={video.video_url || undefined}
        />
        {video.seller_type === "dealer" ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-oto-blue shadow-soft">
            {String(dictionary.status.dealer)}
          </span>
        ) : null}
      </div>
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="line-clamp-2 text-lg font-black text-oto-text">{title}</h2>
            <p className="mt-1 text-sm font-bold text-oto-muted">
              {video.seller_display_name || sellerTypeLabel(video.seller_type, locale)}
            </p>
          </div>
          {video.listing_id ? <FavoriteButton listingId={video.listing_id} /> : null}
        </div>

        {video.description ? (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-oto-muted">{video.description}</p>
        ) : null}

        <div className="mt-4 rounded-md bg-oto-surface p-3">
          {video.listing_title ? (
            <p className="line-clamp-1 text-sm font-black text-oto-text">{video.listing_title}</p>
          ) : null}
          <p className="text-base font-black text-oto-text">{formatPrice(video.price_amount, video.currency, locale)}</p>
          <p className="mt-1 text-xs font-bold text-oto-muted">{details.join(" · ") || (locale === "en" ? "Vehicle details coming soon" : "Araç bilgileri yakında")}</p>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1.45fr_1fr]">
          {video.listing_id ? (
            <ButtonLink href={localizePath(`/listing/${video.listing_id}`, locale)} className="h-10 px-3 text-xs">
              {String(dictionary.video.seeListing)}
            </ButtonLink>
          ) : (
            <ButtonLink href={localizePath("/search", locale)} className="h-10 px-3 text-xs">
              {String(dictionary.video.browseListings)}
            </ButtonLink>
          )}
          {video.listing_id ? (
            <ButtonLink href={localizePath(`/listing/${video.listing_id}`, locale)} variant="secondary" className="h-10 px-3 text-xs">
              {String(dictionary.listing.contactSeller)}
            </ButtonLink>
          ) : (
            <ButtonLink href={`${localizePath("/login", locale)}?next=${encodeURIComponent(localizePath("/video", locale))}`} variant="secondary" className="h-10 px-3 text-xs">
              {String(dictionary.video.login)}
            </ButtonLink>
          )}
          <VideoShareButton title={title} listingId={video.listing_id} />
        </div>

        <p className="mt-4 text-xs font-semibold leading-5 text-oto-muted">
          {String(dictionary.video.contentProvided)}
        </p>
      </div>
    </article>
  );
}

function singleValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}
