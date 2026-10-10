import type { Metadata } from "next";
import { ACTIVE_MARKET_PROFILE } from "@/lib/market";

// The active profile must have an approved public host before SEO metadata can
// be generated. Planned profiles intentionally may not have one yet.
export const SITE_URL = ACTIVE_MARKET_PROFILE.siteUrl;

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
      title: `${title} | ${ACTIVE_MARKET_PROFILE.brandName}`,
      description,
      url,
      siteName: ACTIVE_MARKET_PROFILE.brandName,
      locale: path === "/en" || path.startsWith("/en/") ? "en_US" : ACTIVE_MARKET_PROFILE.metadata.defaultLocale,
      type: "website"
    },
    robots: {
      index: !noIndex,
      follow: !noIndex
    }
  };
}
