import type { Metadata } from "next";
import { ACTIVE_MARKET_PROFILE, type MarketProfile } from "@/lib/market";

export function getPublicSiteUrl(profile: MarketProfile = ACTIVE_MARKET_PROFILE) {
  return profile.siteUrl;
}

export function getMetadataBase(profile: MarketProfile = ACTIVE_MARKET_PROFILE) {
  const siteUrl = getPublicSiteUrl(profile);
  return siteUrl ? new URL(siteUrl) : undefined;
}

export function absoluteUrl(path: string, profile: MarketProfile = ACTIVE_MARKET_PROFILE) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const siteUrl = getPublicSiteUrl(profile);
  return siteUrl ? `${siteUrl}${normalizedPath}` : undefined;
}

export function buildSeoMetadata({
  title,
  description,
  path,
  noIndex = false,
  alternates,
  profile = ACTIVE_MARKET_PROFILE
}: {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
  alternates?: Record<string, string>;
  profile?: MarketProfile;
}): Metadata {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = absoluteUrl(normalizedPath, profile);

  return {
    title,
    description,
    alternates: {
      canonical: url ?? normalizedPath,
      languages: alternates
        ? Object.fromEntries(
            Object.entries(alternates).map(([locale, alternatePath]) => [
              locale,
              absoluteUrl(alternatePath, profile) ?? (alternatePath.startsWith("/") ? alternatePath : `/${alternatePath}`)
            ])
          )
        : undefined
    },
    openGraph: {
      title: `${title} | ${profile.brandName}`,
      description,
      url,
      siteName: profile.brandName,
      locale: normalizedPath === "/en" || normalizedPath.startsWith("/en/") ? "en_US" : profile.metadata.defaultLocale,
      type: "website"
    },
    robots: {
      index: !noIndex,
      follow: !noIndex
    }
  };
}
