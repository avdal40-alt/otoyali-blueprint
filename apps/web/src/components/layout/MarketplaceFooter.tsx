"use client";

import Link from "next/link";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { ACTIVE_MARKET_PROFILE } from "@/lib/market";
import { getJolmodLegalDocument } from "@/i18n/jolmod-legal-documents";
import {
  platformStaffNavigationAction,
  usePlatformStaffNavigation
} from "./PlatformStaffNavigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function MarketplaceFooter() {
  const { locale, dictionary } = useI18n();
  const legal = (key: "terms" | "listingRules" | "privacy" | "consent" | "aiTerms" | "safety" | "support" | "legal") => getJolmodLegalDocument(key, locale).title;
  const marketplaceAction = platformStaffNavigationAction(usePlatformStaffNavigation());
  const groups = [
    {
      title: ACTIVE_MARKET_PROFILE.brandName,
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
        { href: "/yedek-parca", label: String(dictionary.navigation.parts) },
        { href: "/servisler", label: String(dictionary.navigation.services) },
        ...(marketplaceAction ? [{
          href: marketplaceAction === "admin" ? "/admin" : "/sell",
          label: marketplaceAction === "admin"
            ? String(dictionary.common.adminPanel)
            : String(dictionary.footer.sell)
        }] : []),
        { href: "/listing-rules", label: String(dictionary.footer.listingRules) }
      ]
    },
    {
      title: String(dictionary.footer.policies),
      links: [
        { href: "/terms", label: legal("terms") },
        { href: "/listing-rules", label: legal("listingRules") },
        { href: "/privacy", label: legal("privacy") },
        { href: "/personal-data-consent", label: legal("consent") },
        { href: "/ai-terms", label: legal("aiTerms") },
        { href: "/safety", label: legal("safety") },
        { href: "/contact", label: legal("support") },
        { href: "/legal", label: legal("legal") }
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
            {ACTIVE_MARKET_PROFILE.brandName}
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-oto-muted">
            {String(dictionary.footer.description)}
          </p>
          <LanguageSwitcher className="mt-5" />
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
