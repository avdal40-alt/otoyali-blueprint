import Link from "next/link";

const groups = [
  {
    title: "OTOYALI",
    links: [
      { href: "/about", label: "Hakkında" },
      { href: "/trust", label: "Güven Merkezi" },
      { href: "/contact", label: "İletişim" }
    ]
  },
  {
    title: "Pazar",
    links: [
      { href: "/search", label: "Araç al" },
      { href: "/sell", label: "İlan ver" },
      { href: "/listing-rules", label: "İlan Kuralları" }
    ]
  },
  {
    title: "Politikalar",
    links: [
      { href: "/terms", label: "Kullanım Şartları" },
      { href: "/privacy", label: "Gizlilik Politikası" },
      { href: "/cookies", label: "Çerez Politikası" },
      { href: "/moderation-policy", label: "Moderasyon Politikası" }
    ]
  },
  {
    title: "İçerik",
    links: [
      { href: "/news", label: "Haberler" },
      { href: "/video", label: "Video" },
      { href: "/#app", label: "Mobil uygulama" }
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
