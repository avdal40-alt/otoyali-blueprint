import Link from "next/link";

const categories = [
  {
    label: "Otomobiller",
    href: "/search",
    description: "İkinci el ve sıfır km araç ilanları"
  },
  {
    label: "Sıfır km",
    href: "/sifir-km-araba",
    description: "Yeni araç fırsatları"
  },
  {
    label: "Ticari araçlar",
    href: "/ticari-araclar",
    description: "Kamyonet, kamyon, minibüs ve daha fazlası",
    status: "Yakında"
  },
  {
    label: "Deniz araçları",
    href: "/deniz-araclari",
    description: "Tekne, yat, bot ve jet ski",
    status: "Yakında"
  },
  {
    label: "Yedek parça",
    href: "/yedek-parca",
    description: "Parça, aksesuar, lastik ve jant",
    status: "Yakında"
  },
  {
    label: "Sigorta",
    href: "/sigorta",
    description: "Trafik sigortası ve kasko çözümleri",
    status: "Yakında"
  },
  {
    label: "Servisler",
    href: "/servisler",
    description: "Ekspertiz, bakım ve araç hizmetleri",
    status: "Yakında"
  },
  {
    label: "OTOYALI Video",
    href: "/video",
    description: "Araç videoları ve galeri fırsatları"
  },
  {
    label: "AI Asistan",
    href: "/ai-asistan",
    description: "Araç bulma ve ilan karşılaştırma desteği",
    status: "Yakında"
  }
];

export function PrimaryCategoryStrip() {
  return (
    <section id="kategoriler" className="mt-6">
      <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.href}
            href={category.href}
            className="group min-h-[118px] rounded-oto border border-oto-border bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-black text-oto-text">{category.label}</h2>
              {category.status ? (
                <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-black text-oto-blue">{category.status}</span>
              ) : null}
            </div>
            <p className="mt-3 text-sm leading-5 text-oto-muted">{category.description}</p>
            <span className="mt-4 inline-flex text-xs font-black text-oto-blue opacity-0 transition group-hover:opacity-100">Keşfet</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
