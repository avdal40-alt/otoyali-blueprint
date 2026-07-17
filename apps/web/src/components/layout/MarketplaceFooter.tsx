"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

export function MarketplaceFooter() {
  const { locale, dictionary } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const currentHref = `${pathname}${query ? `?${query}` : ""}`;
  const groups = [
    {
      title: "OTOYALI",
      links: [
        { href: "/about", label: String(dictionary.footer.about) },
        { href: "/trust", label: String(dictionary.footer.trustCenter) },
        { href: "/contact", label: String(dictionary.footer.contact) }
      ]
    },
    {
      title: String(dictionary.footer.marketplace),
      links: [
        { href: "/search", label: String(dictionary.footer.buyVehicle) },
        { href: "/sell", label: String(dictionary.footer.sell) },
        { href: "/listing-rules", label: String(dictionary.footer.listingRules) }
      ]
    },
    {
      title: String(dictionary.footer.policies),
      links: [
        { href: "/terms", label: String(dictionary.footer.terms) },
        { href: "/privacy", label: String(dictionary.footer.privacy) },
        { href: "/cookies", label: String(dictionary.footer.cookies) },
        { href: "/moderation-policy", label: String(dictionary.footer.moderation) }
      ]
    },
    {
      title: String(dictionary.footer.content),
      links: [
        { href: "/news", label: String(dictionary.footer.news) },
        { href: "/video", label: String(dictionary.navigation.video) },
        { href: "/#app", label: String(dictionary.footer.mobileApp) }
      ]
    }
  ];

  return (
    <footer className="border-t border-oto-border bg-white pb-24 md:pb-8">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-[1.2fr_2fr] md:px-6 lg:px-8">
        <div>
          <Link href={localizePath("/", locale)} className="text-xl font-black tracking-tight text-oto-text">
            OTOYALI
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-oto-muted">
            {String(dictionary.footer.description)}
          </p>
          <div className="mt-5 inline-flex rounded-full border border-oto-border p-1 text-xs font-bold" aria-label={String(dictionary.common.language)}>
            <Link
              href={localizePath(currentHref, "tr", { forceDefaultLocalePrefix: true })}
              className={locale === "tr" ? "rounded-full bg-oto-text px-2 py-1 text-white" : "px-2 py-1 text-oto-muted"}
              hrefLang="tr"
            >
              Türkçe
            </Link>
            <Link
              href={localizePath(currentHref, "en")}
              className={locale === "en" ? "rounded-full bg-oto-text px-2 py-1 text-white" : "px-2 py-1 text-oto-muted"}
              hrefLang="en"
            >
              English
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {groups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-black text-oto-text">{group.title}</h3>
              <div className="mt-3 grid gap-2">
                {group.links.map((link) => (
                  <Link key={link.label} href={localizePath(link.href, locale)} className="text-sm font-semibold text-oto-muted transition hover:text-oto-blue">
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
