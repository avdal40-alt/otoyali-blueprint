import Link from "next/link";
import { SectionHeader } from "@/components/layout/PageContainer";
import { getDictionary } from "@/i18n/get-dictionary";
import { localizePath } from "@/i18n/config";
import type { Locale } from "@/i18n/types";

export function MarketplaceVerticalsSection({ locale = "tr" }: { locale?: Locale }) {
  const dictionary = getDictionary(locale);
  const verticals =
    locale === "en"
      ? [
          {
            title: String(dictionary.futureVerticals.commercialVehicles),
            href: "/ticari-araclar",
            body: "A future marketplace area for vans, trucks, minibuses, buses, and work machines.",
            items: ["Light commercial", "Pickup", "Work machines"]
          },
          {
            title: String(dictionary.futureVerticals.marineVehicles),
            href: "/deniz-araclari",
            body: "A prepared area for boats, yachts, jet skis, and marine engines.",
            items: ["Boat", "Yacht", "Jet ski"]
          },
          {
            title: String(dictionary.futureVerticals.spareParts),
            href: "/yedek-parca",
            body: "Coming soon for tires, wheels, accessories, care products, and vehicle parts.",
            items: ["Tires and wheels", "Body parts", "Electronics"]
          },
          {
            title: String(dictionary.futureVerticals.insurance),
            href: "/sigorta",
            body: "Preparing comparison support for traffic insurance and casco solutions.",
            items: ["Traffic insurance", "Casco", "Damage history"]
          },
          {
            title: String(dictionary.futureVerticals.services),
            href: "/servisler",
            body: "Inspection, maintenance, repair, and electric vehicle service options.",
            items: ["Inspection", "Scheduled maintenance", "Tire change"]
          },
          {
            title: String(dictionary.futureVerticals.aiAssistant),
            href: "/ai-asistan",
            body: "Preparation for vehicle discovery, listing comparison, and price interpretation support.",
            items: ["Find a vehicle", "Compare", "Interpret price"]
          }
        ]
      : [
          {
            title: "Ticari araçlar",
            href: "/ticari-araclar",
            body: "Kamyonet, kamyon, minibüs, otobüs ve iş makineleri için yeni pazar alanı.",
            items: ["Hafif ticari", "Kamyonet", "İş makineleri"]
          },
          {
            title: "Deniz araçları",
            href: "/deniz-araclari",
            body: "Tekne, yat, bot, jet ski ve deniz motoru ilanları için hazırlanan alan.",
            items: ["Tekne", "Yat", "Jet ski"]
          },
          {
            title: "Yedek parça",
            href: "/yedek-parca",
            body: "Lastik, jant, aksesuar, bakım ürünü ve araç parçaları için yakında.",
            items: ["Lastik ve jant", "Kaporta", "Elektronik"]
          },
          {
            title: "Sigorta",
            href: "/sigorta",
            body: "Trafik sigortası ve kasko çözümlerini karşılaştırmaya hazırlanıyoruz.",
            items: ["Trafik sigortası", "Kasko", "Hasar geçmişi"]
          },
          {
            title: "Servisler",
            href: "/servisler",
            body: "Ekspertiz, bakım, onarım ve elektrikli araç servis seçenekleri.",
            items: ["Ekspertiz", "Periyodik bakım", "Lastik değişimi"]
          },
          {
            title: "OTOYALI AI Asistan",
            href: "/ai-asistan",
            body: "Araç bulma, ilan karşılaştırma ve fiyat yorumlama desteği için hazırlık.",
            items: ["Araç bul", "Karşılaştır", "Fiyatı yorumla"]
          }
        ];

  return (
    <section className="mt-10">
      <SectionHeader title={String(dictionary.home.ecosystem)} eyebrow={String(dictionary.common.comingSoon)} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {verticals.map((vertical) => (
          <Link key={vertical.href} href={localizePath(vertical.href, locale)} className="rounded-oto border border-oto-border bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-black text-oto-text">{vertical.title}</h2>
              <span className="rounded-full bg-oto-surface px-2 py-1 text-[11px] font-black text-oto-muted">{String(dictionary.common.comingSoon)}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-oto-muted">{vertical.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {vertical.items.map((item) => (
                <span key={item} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-oto-blue">
                  {item}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
