import type { Metadata, Viewport } from "next";
import { I18nProvider } from "@/i18n/client";
import { getLocaleDirection } from "@/i18n/config";
import { getClientDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://otoyali.vercel.app"),
  title: {
    default: "OTOYALI - Türkiye'nin akıllı araç pazarı",
    template: "%s | OTOYALI"
  },
  description: "Otomobil, ticari araç, deniz araçları, yedek parça, sigorta ve araç videoları tek platformda.",
  applicationName: "OTOYALI",
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
    title: "OTOYALI",
    description: "Türkiye'nin akıllı araç pazarı.",
    url: "https://otoyali.vercel.app",
    siteName: "OTOYALI",
    locale: "tr_TR",
    type: "website"
  },
  appleWebApp: {
    capable: true,
    title: "OTOYALI",
    statusBarStyle: "default"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2563EB"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = getRequestLocale();
  const dictionary = getClientDictionary(locale);

  return (
    <html lang={locale} dir={getLocaleDirection(locale)}>
      <body>
        <I18nProvider locale={locale} dictionary={dictionary}>{children}</I18nProvider>
      </body>
    </html>
  );
}
