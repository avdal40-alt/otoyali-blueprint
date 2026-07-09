import Link from "next/link";

const categoryLinks = [
  { label: "İkinci el araba", href: "/ikinci-el-araba" },
  { label: "Sıfır km araba", href: "/sifir-km-araba" },
  { label: "Elektrikli araçlar", href: "/elektrikli-araclar" },
  { label: "Otomatik vites", href: "/otomatik-vites-araclar" },
  { label: "SUV araçlar", href: "/suv-araclar" },
  { label: "BMW ilanları", href: "/marka/bmw" },
  { label: "İstanbul araç ilanları", href: "/sehir/istanbul" },
  { label: "İzmir araç ilanları", href: "/sehir/izmir" }
];

export function SeoEntryLinks() {
  return (
    <section className="mt-10 rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-oto-blue">Popüler aramalar</p>
          <h2 className="mt-1 text-xl font-black text-oto-text">Araçları hızlı keşfet</h2>
        </div>
        <Link href="/search" className="text-sm font-black text-oto-blue">Tüm ilanlar</Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {categoryLinks.map((link) => (
          <Link key={link.href} href={link.href} className="rounded-full bg-oto-surface px-3 py-1.5 text-xs font-black text-oto-muted transition hover:bg-blue-50 hover:text-oto-blue">
            {link.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
