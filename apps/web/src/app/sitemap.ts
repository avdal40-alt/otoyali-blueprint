import type { MetadataRoute } from "next";
import { getCities } from "@/lib/queries/cities";
import { getHomeListings } from "@/lib/queries/listings";
import { getMakes, getModels } from "@/lib/queries/makes";
import { ACTIVE_MARKET_PROFILE, getMarketSeoRouteConfig } from "@/lib/market";
import { getPublicSiteUrl } from "@/lib/seo/metadata";
import { citySeoSlug, makeSeoSlug, modelSeoSlug } from "@/lib/seo/slugs";
import { getSitemapVerticals } from "@/lib/marketplace/verticals";
import { getServiceProviders } from "@/lib/queries/services";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getPublicSiteUrl();
  if (!siteUrl) return [];
  const routeConfig = getMarketSeoRouteConfig(ACTIVE_MARKET_PROFILE);

  const now = new Date();
  const [makesResult, modelsResult, citiesResult, listingsResult, serviceProvidersResult] = await Promise.all([
    getMakes(),
    getModels(),
    getCities(),
    getHomeListings(300),
    getServiceProviders({ limit: 300 })
  ]);

  const entries = new Map<string, MetadataRoute.Sitemap[number]>();
  const add = (path: string, priority = 0.6) => {
    entries.set(path, {
      url: `${siteUrl}${path}`,
      lastModified: now,
      changeFrequency: "daily",
      priority
    });
  };

  for (const [localeIndex, localeRoutes] of routeConfig.locales.entries()) {
    for (const path of localeRoutes.staticPaths) {
      add(path, path === "/" ? 1 : localeIndex === 0 ? 0.8 : 0.65);
    }
  }

  const verticalRoutes = getSitemapVerticals().flatMap((vertical) => [vertical.routes.tr, vertical.routes.en]);
  for (const path of verticalRoutes) add(path, path === "/search" ? 0.8 : 0.65);

  for (const make of makesResult.data) {
    const makeSlug = makeSeoSlug(make.make_name, make.make_slug);
    if (makeSlug) {
      for (const [localeIndex, localeRoutes] of routeConfig.locales.entries()) add(`${localeRoutes.makePrefix}/${makeSlug}`, localeIndex === 0 ? 0.7 : 0.55);
    }
  }

  const makesById = new Map(makesResult.data.map((make) => [make.make_id, make]));
  const makesByName = new Map(makesResult.data.map((make) => [make.make_name, make]));
  for (const model of modelsResult.data) {
    const make = model.make_id ? makesById.get(model.make_id) : makesByName.get(model.make_name);
    const makeSlug = makeSeoSlug(make?.make_name ?? model.make_name, make?.make_slug);
    const modelSlug = modelSeoSlug(model.model_name, model.model_slug);
    if (makeSlug && modelSlug) {
      for (const [localeIndex, localeRoutes] of routeConfig.locales.entries()) add(`${localeRoutes.makePrefix}/${makeSlug}/${modelSlug}`, localeIndex === 0 ? 0.65 : 0.5);
    }
  }

  for (const city of citiesResult.data) {
    const citySlug = citySeoSlug(city.city_name, city.city_slug);
    if (citySlug) {
      for (const [localeIndex, localeRoutes] of routeConfig.locales.entries()) add(`${localeRoutes.cityPrefix}/${citySlug}`, localeIndex === 0 ? 0.7 : 0.55);
    }
  }

  for (const listing of listingsResult.data) {
    if (listing.listing_id) {
      for (const [localeIndex, localeRoutes] of routeConfig.locales.entries()) add(`${localeRoutes.listingPrefix}/${listing.listing_id}`, localeIndex === 0 ? 0.75 : 0.55);
    }
  }

  for (const provider of serviceProvidersResult.data) {
    if (provider.provider_slug) {
      for (const [localeIndex, localeRoutes] of routeConfig.locales.entries()) add(`${localeRoutes.serviceProviderPrefix}/${provider.provider_slug}`, localeIndex === 0 ? 0.65 : 0.5);
    }
  }

  return Array.from(entries.values());
}
