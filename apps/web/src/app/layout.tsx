import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { I18nProvider } from "@/i18n/client";
import { getLocaleDirection, getLocaleTag } from "@/i18n/config";
import { getClientDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/i18n/server";
import { PlatformStaffNavigationProvider } from "@/components/layout/PlatformStaffNavigation";
import { ACTIVE_MARKET_PROFILE } from "@/lib/market";
import { getMarketLocaleAlternatePaths, getMetadataBase, getPublicSiteUrl } from "@/lib/seo/metadata";
import { getActiveLaunchMetadata } from "@/lib/seo/kz-launch-metadata";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = getActiveLaunchMetadata(locale);
  const siteUrl = getPublicSiteUrl();
  const alternatePaths = getMarketLocaleAlternatePaths("/");
  const canonicalPath = alternatePaths[locale] ?? alternatePaths.ru ?? "/";

  return {
    metadataBase: getMetadataBase(),
    title: {
      default: `${ACTIVE_MARKET_PROFILE.brandName} - ${copy.title}`,
      template: `%s | ${ACTIVE_MARKET_PROFILE.brandName}`
    },
    description: copy.description,
    alternates: {
      canonical: siteUrl ? `${siteUrl}${canonicalPath}` : canonicalPath,
      languages: Object.fromEntries(Object.entries(alternatePaths).map(([language, path]) => [language, siteUrl ? `${siteUrl}${path}` : path]))
    },
    applicationName: ACTIVE_MARKET_PROFILE.brandName,
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/brand/favicon.svg", type: "image/svg+xml" },
        { url: "/brand/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
        { url: "/brand/android-chrome-512x512.png", sizes: "512x512", type: "image/png" }
      ],
      shortcut: "/brand/favicon.svg",
      apple: "/brand/apple-touch-icon.png"
    },
    openGraph: {
      title: ACTIVE_MARKET_PROFILE.brandName,
      description: copy.openGraphDescription,
      url: siteUrl ?? undefined,
      siteName: ACTIVE_MARKET_PROFILE.brandName,
      locale: copy.openGraphLocale,
      type: "website"
    },
    appleWebApp: {
      capable: true,
      title: ACTIVE_MARKET_PROFILE.brandName,
      statusBarStyle: "default"
    }
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2563EB"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();
  const dictionary = getClientDictionary(locale);
  const { accent, accentStrong } = ACTIVE_MARKET_PROFILE.brandColors;
  const brandColorStyle = {
    ...(accent ? { "--brand-accent": accent } : {}),
    ...(accentStrong ? { "--brand-accent-strong": accentStrong } : {})
  } as CSSProperties;

  return (
    <html lang={getLocaleTag(locale)} dir={getLocaleDirection(locale)}>
      <body style={brandColorStyle}>
        <I18nProvider locale={locale} dictionary={dictionary}>
          <PlatformStaffNavigationProvider>
            {children}
          </PlatformStaffNavigationProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
