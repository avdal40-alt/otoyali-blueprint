import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { localizePath } from "@/i18n/config";
import { getRequestLocale } from "@/i18n/server";
import type { MarketplaceVerticalId } from "@/lib/marketplace/types";
import { getMarketplaceVertical } from "@/lib/marketplace/verticals";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

type Row = { listing_id: string; title: string; category: string; brand: string | null; model: string | null; condition: string; year: number | null; engine_volume_cc: number | null; length_cm: number | null; range_km: number | null; price_amount: number; currency: string; city_name: string };
const copy = {
  ru: { search: "Поиск", category: "Категория", all: "Все", find: "Найти", sell: "Разместить объявление", empty: "Подходящих объявлений пока нет.", city: "Город", price: "Цена" },
  kk: { search: "Іздеу", category: "Санат", all: "Барлығы", find: "Табу", sell: "Хабарландыру беру", empty: "Сәйкес хабарландырулар әзірге жоқ.", city: "Қала", price: "Баға" },
  en: { search: "Search", category: "Category", all: "All", find: "Search", sell: "Create listing", empty: "No matching listings yet.", city: "City", price: "Price" },
  "zh-CN": { search: "搜索", category: "类别", all: "全部", find: "搜索", sell: "发布信息", empty: "暂时没有匹配的信息。", city: "城市", price: "价格" }
} as const;

export async function SpecialtyMarketplacePage({ verticalId, searchParams }: { verticalId: Extract<MarketplaceVerticalId, "motorcycles" | "marine" | "mobility">; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const locale = await getRequestLocale(); const text = copy[locale as keyof typeof copy] ?? copy.ru; const params = await searchParams;
  const one = (key: string) => { const item = params[key]; return Array.isArray(item) ? item[0] : item; };
  const query = one("q")?.trim() || null, category = one("category")?.trim() || null;
  let rows: Row[] = [];
  if (hasSupabaseEnv()) { const { data } = await getSupabaseServerClient().rpc("public_specialty_listings" as never, { p_vertical: verticalId, p_query: query, p_category: category, p_city_id: null, p_limit: 48 } as never); rows = (data ?? []) as Row[]; }
  const vertical = getMarketplaceVertical(verticalId);
  const money = new Intl.NumberFormat(locale === "kk" ? "kk-KZ" : locale === "ru" ? "ru-RU" : locale, { style: "currency", currency: "KZT", maximumFractionDigits: 0 });
  return <><AppHeader /><PageContainer className="py-6"><section className="rounded-oto border border-oto-border bg-oto-surface-raised p-5 shadow-soft md:p-8"><p className="text-sm font-black text-oto-blue">Jolmod</p><h1 className="mt-2 text-3xl font-black tracking-tight text-oto-text md:text-5xl">{verticalId === "motorcycles" ? "Мотоциклы" : verticalId === "marine" ? "Водный транспорт" : "Мобильность"}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-oto-muted">{verticalId === "marine" ? "Частные объявления о водной технике в Казахстане. Jolmod не оформляет сделки и не даёт гарантий регистрации." : "Частные объявления в Казахстане. Связь с продавцом открывается только по защищённому запросу."}</p><Link href={localizePath(`${vertical.routes.tr}/sat`, locale)} className="mt-5 inline-flex min-h-11 items-center rounded-oto bg-oto-orange px-5 text-sm font-black text-white">{text.sell}</Link></section><form className="mt-5 grid gap-3 rounded-oto border border-oto-border bg-oto-surface-raised p-4 shadow-soft md:grid-cols-3" method="get"><label className="text-sm font-bold text-oto-text">{text.search}<input name="q" defaultValue={query ?? ""} className="mt-1 min-h-11 w-full rounded-md border border-oto-border bg-oto-surface-raised px-3" /></label><label className="text-sm font-bold text-oto-text">{text.category}<input name="category" defaultValue={category ?? ""} className="mt-1 min-h-11 w-full rounded-md border border-oto-border bg-oto-surface-raised px-3" /></label><button className="mt-auto min-h-11 rounded-oto bg-oto-blue px-5 text-sm font-black text-white" type="submit">{text.find}</button></form><section aria-live="polite" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map((row) => <Link key={row.listing_id} href={localizePath(`${vertical.routes.tr}/${row.listing_id}`, locale)} className="rounded-oto border border-oto-border bg-oto-surface-raised p-5 shadow-soft transition hover:border-oto-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-oto-blue"><p className="text-xs font-black uppercase tracking-wide text-oto-blue">{row.category} · {row.condition}</p><h2 className="mt-2 text-lg font-black text-oto-text">{row.title}</h2>{row.brand || row.model ? <p className="mt-1 text-sm text-oto-muted">{[row.brand, row.model, row.year].filter(Boolean).join(" · ")}</p> : null}<p className="mt-3 text-xl font-black text-oto-text">{money.format(row.price_amount)}</p><p className="mt-2 text-sm text-oto-muted">{row.city_name}</p></Link>)}</section>{rows.length === 0 ? <p className="mt-8 rounded-oto border border-oto-border bg-oto-surface-raised p-5 text-sm font-bold text-oto-muted">{text.empty}</p> : null}</PageContainer><MarketplaceFooter /><MobileBottomNav /></>;
}
