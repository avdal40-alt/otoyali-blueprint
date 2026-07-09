import Link from "next/link";
import { SectionHeader } from "@/components/layout/PageContainer";

const verticals = [
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

export function MarketplaceVerticalsSection() {
  return (
    <section className="mt-10">
      <SectionHeader title="OTOYALI ekosistemi" eyebrow="Yakında" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {verticals.map((vertical) => (
          <Link key={vertical.href} href={vertical.href} className="rounded-oto border border-oto-border bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-black text-oto-text">{vertical.title}</h2>
              <span className="rounded-full bg-oto-surface px-2 py-1 text-[11px] font-black text-oto-muted">Yakında</span>
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
