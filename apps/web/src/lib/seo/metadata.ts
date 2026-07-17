import type { Metadata } from "next";

export const SITE_URL = "https://otoyali.vercel.app";

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
      title: `${title} | OTOYALI`,
      description,
      url,
      siteName: "OTOYALI",
      locale: "tr_TR",
      type: "website"
    },
    robots: {
      index: !noIndex,
      follow: !noIndex
    }
  };
}
