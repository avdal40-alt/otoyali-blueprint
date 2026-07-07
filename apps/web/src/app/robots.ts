import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo/metadata";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/",
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
        "/suv-araclar"
      ],
      disallow: [
        "/profile",
        "/my-listings",
        "/settings",
        "/admin",
        "/login",
        "/otp",
        "/debug",
        "/api/private"
      ]
    },
    sitemap: `${SITE_URL}/sitemap.xml`
  };
}
