import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { getRequestLocale } from "@/i18n/server";
import { localizePath } from "@/i18n/config";
import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

type PartsRow = { listing_id: string; title: string; description: string | null; category: string; part_condition: string; brand: string | null; part_number: string | null; compatible_vehicles: string[]; price_amount: number; currency: string; city_name: string; published_at: string };

const copy = {
  ru: { eyebrow: "Запчасти", title: "Запчасти для вашего автомобиля", body: "Ищите детали по названию, номеру и состоянию. Оплата и резервирование на Jolmod не проводятся.", search: "Поиск", category: "Категория", condition: "Состояние", all: "Все", new: "Новая", used: "Б/у", refurbished: "Восстановленная", find: "Найти", sell: "Разместить запчасть", empty: "Подходящих объявлений пока нет.", details: "Совместимость" },
  kk: { eyebrow: "Қосалқы бөлшектер", title: "Көлігіңізге қосалқы бөлшектер", body: "Бөлшектерді атауы, нөмірі және күйі бойынша іздеңіз. Jolmod төлемді не броньдауды жүргізбейді.", search: "Іздеу", category: "Санат", condition: "Күйі", all: "Барлығы", new: "Жаңа", used: "Қолданылған", refurbished: "Қалпына келтірілген", find: "Табу", sell: "Бөлшекті жариялау", empty: "Сәйкес хабарландырулар әзірге жоқ.", details: "Үйлесімділік" },
  en: { eyebrow: "Spare parts", title: "Parts for your vehicle", body: "Search by part name, number, and condition. Jolmod does not process payment or reservations.", search: "Search", category: "Category", condition: "Condition", all: "All", new: "New", used: "Used", refurbished: "Refurbished", find: "Search", sell: "List a part", empty: "No matching parts yet.", details: "Compatibility" },
  "zh-CN": { eyebrow: "汽车配件", title: "为您的车辆查找配件", body: "可按名称、零件号和状态搜索。Jolmod 不处理付款或预订。", search: "搜索", category: "类别", condition: "状态", all: "全部", new: "全新", used: "二手", refurbished: "翻新", find: "搜索", sell: "发布配件", empty: "暂时没有匹配的配件。", details: "适配车型" }
} as const;

export async function PartsMarketplacePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const locale = await getRequestLocale(); const text = copy[locale as keyof typeof copy] ?? copy.ru; const params = await searchParams;
  const one = (key: string) => { const value = params[key]; return Array.isArray(value) ? value[0] : value; };
  const query = one("q")?.trim() || null, category = one("category")?.trim() || null, condition = one("condition")?.trim() || null;
  let rows: PartsRow[] = [];
  if (hasSupabaseEnv()) {
    const { data } = await getSupabaseServerClient().rpc("public_parts_search" as never, { p_query: query, p_category: category, p_condition: condition, p_city_id: null, p_limit: 48 } as never);
    rows = (data ?? []) as PartsRow[];
  }
  const href = localizePath("/yedek-parca/sat", locale);
  return <><AppHeader /><PageContainer className="py-6">
    <section className="rounded-oto border border-oto-border bg-gradient-to-br from-white via-white to-blue-50 p-5 shadow-soft md:p-8"><p className="text-sm font-black text-oto-blue">{text.eyebrow}</p><h1 className="mt-2 text-3xl font-black tracking-tight text-oto-text md:text-5xl">{text.title}</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-oto-muted md:text-base">{text.body}</p><Link href={href} className="mt-5 inline-flex min-h-11 items-center rounded-oto bg-oto-orange px-5 text-sm font-black text-white">{text.sell}</Link></section>
    <form className="mt-5 grid gap-3 rounded-oto border border-oto-border bg-white p-4 shadow-soft md:grid-cols-4" method="get"><label className="text-sm font-bold text-oto-text">{text.search}<input name="q" defaultValue={query ?? ""} className="mt-1 min-h-11 w-full rounded-md border border-oto-border px-3" /></label><label className="text-sm font-bold text-oto-text">{text.category}<input name="category" defaultValue={category ?? ""} className="mt-1 min-h-11 w-full rounded-md border border-oto-border px-3" /></label><label className="text-sm font-bold text-oto-text">{text.condition}<select name="condition" defaultValue={condition ?? ""} className="mt-1 min-h-11 w-full rounded-md border border-oto-border px-3"><option value="">{text.all}</option><option value="new">{text.new}</option><option value="used">{text.used}</option><option value="refurbished">{text.refurbished}</option></select></label><button className="mt-auto min-h-11 rounded-oto bg-oto-blue px-5 text-sm font-black text-white" type="submit">{text.find}</button></form>
    <section aria-live="polite" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rows.map((row) => <Link key={row.listing_id} href={localizePath(`/yedek-parca/${row.listing_id}`, locale)} className="rounded-oto border border-oto-border bg-white p-5 shadow-soft transition hover:border-oto-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-oto-blue"><p className="text-xs font-black uppercase tracking-wide text-oto-blue">{row.category} · {row.part_condition}</p><h2 className="mt-2 text-lg font-black text-oto-text">{row.title}</h2>{row.brand ? <p className="mt-1 text-sm text-oto-muted">{row.brand}{row.part_number ? ` · ${row.part_number}` : ""}</p> : null}<p className="mt-3 text-xl font-black text-oto-text">{new Intl.NumberFormat(locale === "kk" ? "kk-KZ" : locale === "ru" ? "ru-RU" : locale, { style: "currency", currency: row.currency, maximumFractionDigits: 0 }).format(row.price_amount)}</p><p className="mt-2 text-sm text-oto-muted">{row.city_name}</p>{row.compatible_vehicles.length ? <p className="mt-3 text-xs leading-5 text-oto-muted">{text.details}: {row.compatible_vehicles.join(", ")}</p> : null}</Link>)}</section>
    {rows.length === 0 ? <p className="mt-8 rounded-oto border border-oto-border bg-white p-5 text-sm font-bold text-oto-muted">{text.empty}</p> : null}
  </PageContainer><MarketplaceFooter /><MobileBottomNav /></>;
}
