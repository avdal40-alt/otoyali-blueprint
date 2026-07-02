import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://otoyali.com"),
  title: {
    default: "OTOYALI - AI-first transportation platform",
    template: "%s | OTOYALI"
  },
  description: "OTOYALI ile araclari kesfedin, arayin, ilanlari inceleyin ve guvenle yayinlayin.",
  applicationName: "OTOYALI",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg"
  },
  openGraph: {
    title: "OTOYALI",
    description: "AI-first transportation platform for Turkey.",
    url: "https://otoyali.com",
    siteName: "OTOYALI",
    locale: "tr_TR",
    type: "website"
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
