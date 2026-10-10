import Image from "next/image";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { getRequestLocale } from "@/i18n/server";

type Props = { params: Promise<{ id: string }> };
type PublicDealer = { display_name: string; avatar_url: string | null; city: string | null; description: string | null; is_verified: boolean; stock_count: number };

export default async function PublicDealerPage({ params }: Props) {
  const { id } = await params;
  const locale = await getRequestLocale();
  if (!hasSupabaseEnv()) notFound();
  const supabase = getSupabaseServerClient();
  const { data: rawProfile } = await supabase.rpc("get_public_dealer_profile", { p_dealer_id: id }).maybeSingle();
  const profile = rawProfile as PublicDealer | null;
  if (!profile) notFound();
  const { data: stock } = await supabase.from("ff_home_listings").select("listing_id,title,price_amount,currency,city,cover_image_url").eq("seller_type", "dealer").eq("seller_display_name", profile.display_name).limit(24);

  return <><AppHeader /><PageContainer><main className="mx-auto max-w-5xl">
    <section className="overflow-hidden rounded-oto border border-oto-border bg-white shadow-soft">
      <div className="h-32 bg-gradient-to-r from-oto-orange to-oto-yellow md:h-48" aria-label="Dealer cover" />
      <div className="-mt-12 flex flex-col gap-4 px-5 pb-6 md:-mt-16 md:flex-row md:items-end md:px-8">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-oto-surface shadow-soft md:h-32 md:w-32">
          {profile.avatar_url ? <Image src={profile.avatar_url} alt="" fill className="object-cover" sizes="128px" /> : <Image src="/brand/otoyali-logo-monochrome.svg" alt="" fill className="object-contain p-5" sizes="128px" />}
        </div>
        <div><h1 className="text-2xl font-black text-oto-text md:text-3xl">{profile.display_name}</h1><p className="mt-1 text-sm text-oto-muted">{profile.city || (locale === "en" ? "Location unavailable" : "Konum belirtilmemiş")}</p></div>
        {profile.is_verified ? <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-bold text-oto-success">✓ {locale === "en" ? "Verified dealer" : "Doğrulanmış galeri"}</span> : null}
      </div>
    </section>
    <section className="mt-5 grid gap-5 md:grid-cols-[1fr_2fr]"><article className="rounded-oto border border-oto-border bg-white p-5"><h2 className="text-lg font-black">{locale === "en" ? "About" : "Hakkında"}</h2><p className="mt-2 text-sm leading-6 text-oto-muted">{profile.description || (locale === "en" ? "Public dealer profile" : "Herkese açık galeri profili")}</p><p className="mt-4 text-sm font-bold text-oto-text">{profile.stock_count} {locale === "en" ? "vehicles in stock" : "stokta araç"}</p></article><section><h2 className="mb-3 text-xl font-black">{locale === "en" ? "Vehicles" : "Araçlar"}</h2><div className="grid gap-3 sm:grid-cols-2">{(stock ?? []).map((item) => <article key={item.listing_id} className="rounded-oto border border-oto-border bg-white p-4"><h3 className="font-bold">{item.title}</h3><p className="mt-2 text-sm text-oto-muted">{item.city}</p><p className="mt-2 font-black">{item.price_amount} {item.currency}</p></article>)}</div></section></section>
  </main></PageContainer><MarketplaceFooter /><MobileBottomNav /></>;
}
