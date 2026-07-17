import Link from "next/link";
import { getDictionary } from "@/i18n/get-dictionary";
import { localizePath } from "@/i18n/config";
import type { Locale } from "@/i18n/types";

export function PrimaryCategoryStrip({ locale = "tr" }: { locale?: Locale }) {
  const dictionary = getDictionary(locale);
  const categories = [
    {
      label: locale === "en" ? "Cars" : "Otomobiller",
      href: "/search",
      description: locale === "en" ? "Used and new vehicle listings" : "İkinci el ve sıfır km araç ilanları"
    },
    {
      label: String(dictionary.navigation.newCars),
      href: "/sifir-km-araba",
      description: locale === "en" ? "New car opportunities" : "Yeni araç fırsatları"
    },
    {
      label: String(dictionary.futureVerticals.commercialVehicles),
      href: "/ticari-araclar",
      description: locale === "en" ? "Vans, trucks, minibuses, and more" : "Kamyonet, kamyon, minibüs ve daha fazlası",
      status: String(dictionary.common.comingSoon)
    },
    {
      label: String(dictionary.futureVerticals.marineVehicles),
      href: "/deniz-araclari",
      description: locale === "en" ? "Boats, yachts, jet skis, and marine engines" : "Tekne, yat, bot ve jet ski",
      status: String(dictionary.common.comingSoon)
    },
    {
      label: String(dictionary.futureVerticals.spareParts),
      href: "/yedek-parca",
      description: locale === "en" ? "Parts, accessories, tires, and wheels" : "Parça, aksesuar, lastik ve jant",
      status: String(dictionary.common.comingSoon)
    },
    {
      label: String(dictionary.futureVerticals.insurance),
      href: "/sigorta",
      description: locale === "en" ? "Traffic insurance and casco solutions" : "Trafik sigortası ve kasko çözümleri",
      status: String(dictionary.common.comingSoon)
    },
    {
      label: String(dictionary.futureVerticals.services),
      href: "/servisler",
      description: locale === "en" ? "Inspection, maintenance, and vehicle services" : "Ekspertiz, bakım ve araç hizmetleri",
      status: String(dictionary.common.comingSoon)
    },
    {
      label: String(dictionary.video.title),
      href: "/video",
      description: String(dictionary.video.subtitle)
    },
    {
      label: String(dictionary.futureVerticals.aiAssistant),
      href: "/ai-asistan",
      description: locale === "en" ? "Vehicle discovery and listing comparison support" : "Araç bulma ve ilan karşılaştırma desteği",
      status: String(dictionary.common.comingSoon)
    }
  ];

  return (
    <section id="kategoriler" className="mt-6">
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.href}
            href={localizePath(category.href, locale)}
            className="group min-h-[118px] rounded-oto border border-oto-border bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-black text-oto-text">{category.label}</h2>
              {category.status ? (
                <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-black text-oto-blue">{category.status}</span>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-5 text-oto-muted">{category.description}</p>
            <span className="mt-4 inline-flex text-xs font-black text-oto-blue opacity-0 transition group-hover:opacity-100">{String(dictionary.home.explore)}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
