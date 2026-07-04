import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://otoyali.vercel.app"),
  title: {
    default: "OTOYALI - AI-first transportation platform",
    template: "%s | OTOYALI"
  },
  description: "OTOYALI ile araclari kesfedin, arayin, ilanlari inceleyin ve guvenle yayinlayin.",
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
    description: "AI-first transportation platform for Turkey.",
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
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
