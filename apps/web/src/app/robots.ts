import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/metadata";
import { getSitemapVerticals } from "@/lib/marketplace/verticals";

export default function robots(): MetadataRoute.Robots {
  const verticalRoutes = getSitemapVerticals().flatMap((vertical) => [vertical.routes.tr, vertical.routes.en]);

  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
        "/en",
        "/en/",
        "/en/search",
        "/en/listing/",
        "/en/listing/*",
        "/en/video",
        "/en/used-cars",
        "/en/new-cars",
        "/en/electric-vehicles",
        "/en/automatic-cars",
        "/en/suv",
        ...verticalRoutes,
        "/en/make/",
        "/en/make/*",
        "/en/city/",
        "/en/city/*",
        "/en/terms",
        "/en/privacy",
        "/en/cookies",
        "/en/listing-rules",
        "/en/moderation-policy",
        "/en/trust",
        "/en/contact",
        "/search",
        "/listing/",
        "/listing/*",
        "/video",
        "/ikinci-el-araba",
        "/sifir-km-araba",
        "/marka/",
        "/marka/*",
        "/sehir/",
        "/sehir/*",
        "/elektrikli-araclar",
        "/otomatik-vites-araclar",
        "/suv-araclar",
        "/ai-asistan",
        "/terms",
        "/privacy",
        "/cookies",
        "/listing-rules",
        "/moderation-policy",
        "/trust",
        "/contact"
      ],
      disallow: [
        "/profile",
        "/en/profile",
        "/my-listings",
        "/en/my-listings",
        "/settings",
        "/en/settings",
        "/admin",
        "/admin/*",
        "/en/admin",
        "/en/admin/*",
        "/login",
        "/en/login",
        "/otp",
        "/en/otp",
        "/debug",
        "/api/private"
      ]
    },
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
