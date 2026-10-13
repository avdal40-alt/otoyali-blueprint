import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { SafeImage } from "@/components/ui/SafeImage";
import { DealerFollowButton } from "@/components/dealer/DealerFollowButton";
import { localizePath } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/server";
import type { Locale } from "@/i18n/types";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };
type PublicDealer = { display_name: string; avatar_url: string | null; city: string | null; description: string | null; is_verified: boolean; stock_count: number; follower_count: number; is_following: boolean };
type DealerListing = { listing_id: string; title: string | null; price_amount: number | null; currency: string | null; city: string | null; cover_image_url: string | null; video_count: number | null };
type DealerPost = { post_id: string; body: string | null; created_at: string; attachments: Array<{ listing_id: string; title: string | null; price_amount: number | null; currency: string | null; image_url: string | null; has_video: boolean }> };
type DealerLive = { stream_id: string; title: string; started_at: string };

const tabs = ["posts", "cars", "videos", "live"] as const;
type Tab = (typeof tabs)[number];

function selectedTab(value: string | undefined): Tab {
  return tabs.includes(value as Tab) ? value as Tab : "posts";
}

function tabLabel(tab: Tab) {
  return ({ posts: "Posts", cars: "Cars", videos: "Videos", live: "Live" })[tab];
}

function EmptyTab({ title, body }: { title: string; body: string }) {
  return <div className="rounded-oto border border-dashed border-oto-border bg-oto-surface p-6 text-center"><h2 className="font-black text-oto-text">{title}</h2><p className="mt-2 text-sm text-oto-muted">{body}</p></div>;
}

export default async function PublicDealerPage({ params, searchParams }: Props) {
  const { id } = await params;
  const tab = selectedTab((await searchParams).tab);
  const locale = await getRequestLocale();
  if (!hasSupabaseEnv()) notFound();
  const supabase = getSupabaseServerClient();
  const { data: rawProfile } = await supabase.rpc("get_public_dealer_profile", { p_dealer_id: id }).maybeSingle();
  const profile = rawProfile as PublicDealer | null;
  if (!profile) notFound();

  const { data: rawStock } = await supabase.from("ff_home_listings").select("listing_id,title,price_amount,currency,city,cover_image_url,video_count").eq("seller_type", "dealer").eq("seller_display_name", profile.display_name).limit(24);
  const stock = (rawStock ?? []) as DealerListing[];
  const { data: rawPosts } = tab === "posts" ? await supabase.rpc("get_public_dealer_posts", { p_dealer_id: id, p_limit: 20 }) : { data: [] };
  const { data: rawLiveStreams } = tab === "live" ? await supabase.rpc("list_public_dealer_live_streams", { p_dealer_id: id, p_limit: 12 }) : { data: [] };
  const posts = (rawPosts ?? []) as DealerPost[];
  const liveStreams = (rawLiveStreams ?? []) as DealerLive[];
  const videoListings = stock.filter((listing) => (listing.video_count ?? 0) > 0);
  const tabHref = (value: Tab) => localizePath(`/dealer/${id}?tab=${value}`, locale);

  return <><AppHeader /><PageContainer><main className="mx-auto max-w-5xl">
    <section className="overflow-hidden rounded-oto border border-oto-border bg-white shadow-soft">
      <div className="h-32 bg-gradient-to-r from-oto-orange to-oto-yellow md:h-48" aria-label="Dealer cover" />
      <div className="-mt-12 flex flex-col gap-4 px-5 pb-6 md:-mt-16 md:flex-row md:items-end md:px-8">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-oto-surface shadow-soft md:h-32 md:w-32">
          {profile.avatar_url ? <Image src={profile.avatar_url} alt="" fill className="object-cover" sizes="128px" /> : <Image src="/brand/otoyali-logo-monochrome.svg" alt="" fill className="object-contain p-5" sizes="128px" />}
        </div>
        <div><h1 className="text-2xl font-black text-oto-text md:text-3xl">{profile.display_name}</h1><p className="mt-1 text-sm text-oto-muted">{profile.city || (locale === "en" ? "Location unavailable" : "Konum belirtilmemiş")}</p></div>
        <div className="flex flex-wrap items-center gap-3">{profile.is_verified ? <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-bold text-oto-success">✓ {locale === "en" ? "Verified dealer" : "Doğrulanmış galeri"}</span> : null}<DealerFollowButton dealerId={id} initialFollowing={profile.is_following} initialCount={profile.follower_count} /></div>
      </div>
    </section>
    <section className="mt-5 grid gap-5 md:grid-cols-[1fr_2fr]"><article className="rounded-oto border border-oto-border bg-white p-5"><h2 className="text-lg font-black">{locale === "en" ? "About" : "Hakkında"}</h2><p className="mt-2 text-sm leading-6 text-oto-muted">{profile.description || (locale === "en" ? "Public dealer profile" : "Herkese açık galeri profili")}</p><p className="mt-4 text-sm font-bold text-oto-text">{profile.stock_count} {locale === "en" ? "vehicles in stock" : "stokta araç"}</p></article>
      <section aria-labelledby="dealer-content"><h2 id="dealer-content" className="sr-only">Dealer content</h2><nav aria-label="Dealer content" className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1">{tabs.map((item) => <Link key={item} href={tabHref(item)} aria-current={tab === item ? "page" : undefined} className={`min-h-11 shrink-0 rounded-full px-4 py-2 text-sm font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-oto-blue ${tab === item ? "bg-oto-blue text-white" : "border border-oto-border bg-white text-oto-text hover:border-oto-blue"}`}>{tabLabel(item)}</Link>)}</nav>
        {tab === "posts" ? (posts.length ? <div className="space-y-3">{posts.map((post) => <article key={post.post_id} className="rounded-oto border border-oto-border bg-white p-4"><time className="text-xs font-bold text-oto-muted" dateTime={post.created_at}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(post.created_at))}</time>{post.body ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-oto-text">{post.body}</p> : null}{post.attachments.length ? <div className="mt-3 grid gap-3 sm:grid-cols-2">{post.attachments.map((listing) => <Link key={listing.listing_id} href={localizePath(`/listing/${listing.listing_id}`, locale)} className="overflow-hidden rounded-oto border border-oto-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-oto-blue">{listing.image_url ? <div className="aspect-[4/3] bg-oto-surface"><SafeImage src={listing.image_url} alt="" /></div> : null}<div className="p-3"><h3 className="font-bold text-oto-text">{listing.title || "Vehicle"}</h3><p className="mt-1 text-sm font-black text-oto-text">{listing.price_amount ?? ""} {listing.currency ?? ""}</p>{listing.has_video ? <span className="mt-2 inline-block rounded-full bg-oto-blue px-2 py-1 text-xs font-bold text-white">Video</span> : null}</div></Link>)}</div> : null}</article>)}</div> : <EmptyTab title="No posts yet" body="This dealer has not published any public posts." />) : null}
        {tab === "cars" ? <DealerListings listings={stock} locale={locale} emptyTitle="No vehicles available" emptyBody="This dealer has no eligible public listings right now." /> : null}
        {tab === "videos" ? <DealerListings listings={videoListings} locale={locale} emptyTitle="No videos available" emptyBody="This dealer has no eligible public listing videos right now." /> : null}
        {tab === "live" ? (liveStreams.length ? <div className="grid gap-3 sm:grid-cols-2">{liveStreams.map((stream) => <Link key={stream.stream_id} href={localizePath(`/live/${stream.stream_id}`, locale)} className="rounded-oto border border-oto-border bg-white p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-oto-blue"><span className="inline-flex rounded-full bg-red-600 px-2 py-1 text-xs font-black text-white">LIVE</span><h3 className="mt-3 font-black text-oto-text">{stream.title}</h3><time className="mt-2 block text-sm text-oto-muted" dateTime={stream.started_at}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(stream.started_at))}</time></Link>)}</div> : <EmptyTab title="No live streams right now" body="Live streams will appear here when this dealer is live." />) : null}
      </section></section>
  </main></PageContainer><MarketplaceFooter /><MobileBottomNav /></>;
}

function DealerListings({ listings, locale, emptyTitle, emptyBody }: { listings: DealerListing[]; locale: Locale; emptyTitle: string; emptyBody: string }) {
  if (!listings.length) return <EmptyTab title={emptyTitle} body={emptyBody} />;
  return <div className="grid gap-3 sm:grid-cols-2">{listings.map((item) => <Link key={item.listing_id} href={localizePath(`/listing/${item.listing_id}`, locale)} className="overflow-hidden rounded-oto border border-oto-border bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-oto-blue"><div className="aspect-[4/3] bg-oto-surface">{item.cover_image_url ? <SafeImage src={item.cover_image_url} alt="" /> : null}</div><div className="p-4"><h3 className="font-bold text-oto-text">{item.title || "Vehicle"}</h3><p className="mt-2 text-sm text-oto-muted">{item.city}</p><p className="mt-2 font-black text-oto-text">{item.price_amount} {item.currency}</p>{(item.video_count ?? 0) > 0 ? <span className="mt-2 inline-block rounded-full bg-oto-blue px-2 py-1 text-xs font-bold text-white">Video</span> : null}</div></Link>)}</div>;
}
