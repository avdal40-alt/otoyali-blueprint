import type { MetadataRoute } from "next";
import { ACTIVE_MARKET_PROFILE, getMarketSeoRouteConfig } from "@/lib/market";
import { getPublicSiteUrl } from "@/lib/seo/metadata";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getPublicSiteUrl();
  const routeConfig = getMarketSeoRouteConfig(ACTIVE_MARKET_PROFILE);
  const configuredRoutes = routeConfig.locales.flatMap((locale) => [
    ...locale.staticPaths,
    `${locale.makePrefix}/`,
    `${locale.makePrefix}/*`,
    `${locale.cityPrefix}/`,
    `${locale.cityPrefix}/*`,
    `${locale.listingPrefix}/`,
    `${locale.listingPrefix}/*`,
    `${locale.serviceProviderPrefix}/`,
    `${locale.serviceProviderPrefix}/*`
  ]);
  return {
    rules: {
      userAgent: "*",
      allow: [...new Set(["/", ...configuredRoutes])],
      disallow: [...routeConfig.disallow]
    },
    ...(siteUrl ? { sitemap: `${siteUrl}/sitemap.xml` } : {})
  };
}
