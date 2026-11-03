import { notFound } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import { PartsContactButton } from "./parts-contact-button";

type Detail = { listing_id: string; title: string; description: string | null; category: string; part_condition: string; brand: string | null; part_number: string | null; compatible_vehicles: string[]; price_amount: number; currency: string; city_name: string; published_at: string };

export default async function PartsListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let listing: Detail | null = null;
  if (hasSupabaseEnv()) {
    const { data } = await getSupabaseServerClient().rpc("public_parts_listing_detail" as never, { p_listing_id: id } as never);
    listing = ((data as Detail[] | null) ?? [])[0] ?? null;
  }
  if (!listing) notFound();
  return <><AppHeader /><PageContainer className="max-w-3xl py-6"><article className="rounded-oto border border-oto-border bg-white p-5 shadow-soft md:p-8"><p className="text-xs font-black uppercase tracking-wide text-oto-blue">{listing.category} · {listing.part_condition}</p><h1 className="mt-2 text-3xl font-black text-oto-text">{listing.title}</h1><p className="mt-4 text-2xl font-black text-oto-text">{new Intl.NumberFormat("ru-RU", { style: "currency", currency: listing.currency, maximumFractionDigits: 0 }).format(listing.price_amount)}</p><dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2"><div><dt className="font-bold text-oto-muted">Город</dt><dd>{listing.city_name}</dd></div>{listing.brand ? <div><dt className="font-bold text-oto-muted">Марка</dt><dd>{listing.brand}</dd></div> : null}{listing.part_number ? <div><dt className="font-bold text-oto-muted">Номер детали</dt><dd>{listing.part_number}</dd></div> : null}{listing.compatible_vehicles.length ? <div><dt className="font-bold text-oto-muted">Совместимость</dt><dd>{listing.compatible_vehicles.join(", ")}</dd></div> : null}</dl>{listing.description ? <p className="mt-6 whitespace-pre-wrap text-sm leading-6 text-oto-text">{listing.description}</p> : null}<PartsContactButton listingId={listing.listing_id} /></article></PageContainer><MarketplaceFooter /><MobileBottomNav /></>;
}
