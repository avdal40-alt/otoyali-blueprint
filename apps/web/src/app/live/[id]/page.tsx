import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { SafeImage } from "@/components/ui/SafeImage";
import { localizePath } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/server";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };
type PublicLiveStream = { stream_id: string; dealer_id: string; title: string; status: "live"; started_at: string; listings: PublicLiveListing[] };
type PublicLiveListing = { listing_id: string; title: string | null; price_amount: number | null; currency: string | null; city: string | null; image_url: string | null; has_video: boolean };

export default async function DealerLiveViewerPage({ params }: Props) {
  const { id } = await params;
  const locale = await getRequestLocale();
  if (!hasSupabaseEnv()) notFound();
  const supabase = getSupabaseServerClient();
  const { data: rawStream } = await supabase.rpc("get_public_dealer_live_stream", { p_stream_id: id }).maybeSingle();
  const stream = rawStream as PublicLiveStream | null;
  if (!stream) notFound();

  return <><AppHeader /><PageContainer><main className="mx-auto max-w-5xl">
    <Link href={localizePath(`/dealer/${stream.dealer_id}?tab=live`, locale)} className="inline-flex min-h-11 items-center text-sm font-bold text-oto-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-oto-blue">← Back to dealer Live</Link>
    <section className="mt-3 overflow-hidden rounded-oto border border-oto-border bg-white shadow-soft">
      <div className="flex aspect-video items-center justify-center bg-oto-text p-6 text-center text-white">
        <div><span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black">LIVE</span><h1 className="mt-4 text-2xl font-black sm:text-3xl">{stream.title}</h1><p className="mt-2 text-sm text-white/80">Live playback will appear here through the configured streaming provider.</p></div>
      </div>
      <div className="p-5"><h2 className="text-lg font-black text-oto-text">Vehicles featured in this live</h2><p className="mt-1 text-sm text-oto-muted">Open a vehicle to view its full public listing.</p>
        {stream.listings.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{stream.listings.map((listing) => <Link key={listing.listing_id} href={localizePath(`/listing/${listing.listing_id}`, locale)} className="overflow-hidden rounded-oto border border-oto-border focus-visible:outline focus-visible:outline-2 focus-visible:outline-oto-blue"><div className="aspect-[4/3] bg-oto-surface">{listing.image_url ? <SafeImage src={listing.image_url} alt="" /> : null}</div><div className="p-4"><h3 className="font-bold text-oto-text">{listing.title || "Vehicle"}</h3><p className="mt-2 text-sm text-oto-muted">{listing.city}</p><p className="mt-2 font-black text-oto-text">{listing.price_amount} {listing.currency}</p>{listing.has_video ? <span className="mt-2 inline-block rounded-full bg-oto-blue px-2 py-1 text-xs font-bold text-white">Video</span> : null}</div></Link>)}</div> : <p className="mt-4 rounded-oto border border-dashed border-oto-border bg-oto-surface p-5 text-sm text-oto-muted">No public vehicle listings are attached to this live.</p>}
      </div>
    </section>
  </main></PageContainer><MarketplaceFooter /><MobileBottomNav /></>;
}
