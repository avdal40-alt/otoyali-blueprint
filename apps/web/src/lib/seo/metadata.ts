import type { Metadata } from "next";

export const SITE_URL = "https://yolmod.com";

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function buildSeoMetadata({
  title,
  description,
  path,
  noIndex = false,
  alternates
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  alternates?: Record<string, string>;
}): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: alternates
        ? Object.fromEntries(Object.entries(alternates).map(([locale, alternatePath]) => [locale, absoluteUrl(alternatePath)]))
        : undefined
    },
    openGraph: {
      title: `${title} | Yolmod`,
      description,
      url,
      siteName: "Yolmod",
      locale: path === "/en" || path.startsWith("/en/") ? "en_US" : "tr_TR",
      type: "website"
    },
    robots: {
      index: !noIndex,
      follow: !noIndex
    }
  };
}
