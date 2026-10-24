import type { Metadata } from "next";
import { ACTIVE_MARKET_PROFILE, getMarketSeoRouteConfig, type MarketProfile } from "@/lib/market";

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

/**
 * Produces KZ launch alternates from the market-owned SEO route configuration.
 * Language only changes the path prefix; it never selects a different market.
 */
export function getMarketLocaleAlternatePaths(path: string, profile: MarketProfile = ACTIVE_MARKET_PROFILE) {
  const routeConfig = getMarketSeoRouteConfig(profile);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const knownLocales = routeConfig.locales.map((route) => route.locale);
  const firstSegment = normalizedPath.split("/").filter(Boolean)[0];
  const barePath = firstSegment && knownLocales.includes(firstSegment)
    ? normalizedPath.slice(firstSegment.length + 1) || "/"
    : normalizedPath;
  const defaultLocale = routeConfig.locales[0]?.locale;

  return Object.fromEntries(routeConfig.locales.map((route) => [
    route.locale,
    route.locale === defaultLocale ? barePath : `/${route.locale}${barePath === "/" ? "" : barePath}`
  ]));
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
  const resolvedAlternates = alternates ?? getMarketLocaleAlternatePaths(normalizedPath, profile);

  return {
    title,
    description,
    alternates: {
      canonical: url ?? normalizedPath,
      languages: resolvedAlternates
        ? Object.fromEntries(
            Object.entries(resolvedAlternates).map(([locale, alternatePath]) => [
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
