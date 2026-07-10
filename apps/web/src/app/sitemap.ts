import type { MetadataRoute } from "next";
import { getCities } from "@/lib/queries/cities";
import { getHomeListings } from "@/lib/queries/listings";
import { getMakes, getModels } from "@/lib/queries/makes";
import { SITE_URL } from "@/lib/seo/metadata";
import { citySeoSlug, makeSeoSlug, modelSeoSlug } from "@/lib/seo/slugs";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPaths = [
    "/",
    "/search",
    "/video",
    "/ikinci-el-araba",
    "/sifir-km-araba",
    "/elektrikli-araclar",
    "/otomatik-vites-araclar",
    "/suv-araclar",
    "/ticari-araclar",
    "/deniz-araclari",
    "/yedek-parca",
    "/sigorta",
    "/servisler",
    "/ai-asistan",
    "/terms",
    "/privacy",
    "/cookies",
    "/listing-rules",
    "/moderation-policy",
    "/trust",
    "/contact"
  ];

  const [makesResult, modelsResult, citiesResult, listingsResult] = await Promise.all([
    getMakes(),
    getModels(),
    getCities(),
    getHomeListings(300)
  ]);

  const entries = new Map<string, MetadataRoute.Sitemap[number]>();
  const add = (path: string, priority = 0.6) => {
    entries.set(path, {
      url: `${SITE_URL}${path}`,
      lastModified: now,
      changeFrequency: "daily",
      priority
    });
  };

  for (const path of staticPaths) {
    add(path, path === "/" ? 1 : 0.8);
  }

  for (const make of makesResult.data) {
    const makeSlug = makeSeoSlug(make.make_name, make.make_slug);
    if (makeSlug) add(`/marka/${makeSlug}`, 0.7);
  }

  const makesById = new Map(makesResult.data.map((make) => [make.make_id, make]));
  const makesByName = new Map(makesResult.data.map((make) => [make.make_name, make]));
  for (const model of modelsResult.data) {
    const make = model.make_id ? makesById.get(model.make_id) : makesByName.get(model.make_name);
    const makeSlug = makeSeoSlug(make?.make_name ?? model.make_name, make?.make_slug);
    const modelSlug = modelSeoSlug(model.model_name, model.model_slug);
    if (makeSlug && modelSlug) add(`/marka/${makeSlug}/${modelSlug}`, 0.65);
  }

  for (const city of citiesResult.data) {
    const citySlug = citySeoSlug(city.city_name, city.city_slug);
    if (citySlug) add(`/sehir/${citySlug}`, 0.7);
  }

  for (const listing of listingsResult.data) {
    if (listing.listing_id) add(`/listing/${listing.listing_id}`, 0.75);
  }

  return Array.from(entries.values());
}
