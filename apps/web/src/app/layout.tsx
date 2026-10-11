import type { Metadata, Viewport } from "next";
import { I18nProvider } from "@/i18n/client";
import { getLocaleDirection, getLocaleTag } from "@/i18n/config";
import { getClientDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/i18n/server";
import { ACTIVE_MARKET_PROFILE } from "@/lib/market";
import { getMetadataBase, getPublicSiteUrl } from "@/lib/seo/metadata";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: {
    default: `${ACTIVE_MARKET_PROFILE.brandName} - ${ACTIVE_MARKET_PROFILE.metadata.defaultTitle}`,
    template: `%s | ${ACTIVE_MARKET_PROFILE.brandName}`
  },
  description: ACTIVE_MARKET_PROFILE.metadata.description,
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
    description: ACTIVE_MARKET_PROFILE.metadata.openGraphDescription,
    url: getPublicSiteUrl() ?? undefined,
    siteName: ACTIVE_MARKET_PROFILE.brandName,
    locale: ACTIVE_MARKET_PROFILE.metadata.defaultLocale,
    type: "website"
  },
  appleWebApp: {
    capable: true,
    title: ACTIVE_MARKET_PROFILE.brandName,
    statusBarStyle: "default"
  }
};

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

  return (
    <html lang={getLocaleTag(locale)} dir={getLocaleDirection(locale)}>
      <body>
        <I18nProvider locale={locale} dictionary={dictionary}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
