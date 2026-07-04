import Link from "next/link";

const groups = [
  {
    title: "OTOYALI",
    links: [
      { href: "/about", label: "Hakkında" },
      { href: "/privacy", label: "Gizlilik" },
      { href: "/terms", label: "Kullanım şartları" }
    ]
  },
  {
    title: "Pazar",
    links: [
      { href: "/search", label: "Araç al" },
      { href: "/sell", label: "İlan ver" },
      { href: "/favorites", label: "Favoriler" }
    ]
  },
  {
    title: "İçerik",
    links: [
      { href: "/news", label: "Haberler" },
      { href: "/settings", label: "Yardım" },
      { href: "/notifications", label: "Bildirimler" }
    ]
  },
  {
    title: "Mobil uygulama",
    links: [
      { href: "/#app", label: "Android yakında" },
      { href: "/#app", label: "iOS yakında" },
      { href: "/#app", label: "PWA" }
    ]
  }
];

export function MarketplaceFooter() {
  return (
    <footer className="border-t border-oto-border bg-white pb-24 md:pb-8">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[1.2fr_2fr] md:px-6 lg:px-8">
        <div>
          <Link href="/" className="text-xl font-black tracking-tight text-oto-text">
            OTOYALI
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-oto-muted">
            AI-first ulaşım ekosistemi. Araç arama, ilan inceleme, haber ve ilan yayınlama deneyimini tek yerde toplar.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-black text-oto-text">{group.title}</h3>
              <div className="mt-3 grid gap-2">
                {group.links.map((link) => (
                  <Link key={link.label} href={link.href} className="text-sm font-semibold text-oto-muted transition hover:text-oto-blue">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
