import type { MarketplaceSeoConfig } from "@/components/seo/MarketplaceSeoPage";

export const usedCarsSeoConfig: MarketplaceSeoConfig = {
  path: "/ikinci-el-araba",
  h1: "İkinci el araba ilanları",
  description: "Türkiye genelindeki ikinci el araba ilanlarını marka, model, şehir, fiyat ve teknik özelliklere göre keşfedin.",
  ctaLabel: "İlanları incele",
  filters: { condition: "used" },
  breadcrumbs: [
    { label: "Ana sayfa", href: "/" },
    { label: "İkinci el araba ilanları" }
  ],
  summary: [
    { label: "Durum", value: "İkinci el" },
    { label: "Kapsam", value: "Türkiye" }
  ],
  seoText: "İkinci el araba ilanları sayfası, aktif araçları marka, model, şehir ve teknik özelliklere göre keşfetmeniz için hazırlanmıştır. Daha ayrıntılı filtreler için arama sayfasını kullanabilirsiniz."
};

export const newCarsSeoConfig: MarketplaceSeoConfig = {
  path: "/sifir-km-araba",
  h1: "Sıfır km araba ilanları",
  description: "Sıfır kilometre araç ilanlarını marka, model, şehir ve fiyat seçenekleriyle karşılaştırın.",
  ctaLabel: "Sıfır km araçları gör",
  filters: { condition: "new" },
  breadcrumbs: [
    { label: "Ana sayfa", href: "/" },
    { label: "Sıfır km araba ilanları" }
  ],
  summary: [
    { label: "Durum", value: "Sıfır km" },
    { label: "Kapsam", value: "Türkiye" }
  ],
  seoText: "Sıfır kilometre araç ilanlarında marka, model, şehir ve fiyat seçeneklerini hızlıca karşılaştırabilirsiniz. OTOYALI, yeni araç arama deneyimini sade ve filtrelenebilir tutar."
};

export const electricCarsSeoConfig: MarketplaceSeoConfig = {
  path: "/elektrikli-araclar",
  h1: "Elektrikli araç ilanları",
  description: "Elektrikli araç ilanlarını menzil, fiyat, şehir ve marka seçeneklerine göre keşfedin.",
  ctaLabel: "Elektrikli araçları gör",
  filters: { fuelType: "electric" },
  breadcrumbs: [
    { label: "Ana sayfa", href: "/" },
    { label: "Elektrikli araç ilanları" }
  ],
  summary: [
    { label: "Yakıt", value: "Elektrikli" },
    { label: "Kapsam", value: "Türkiye" }
  ],
  seoText: "Elektrikli araç ilanları, şehir içi kullanım ve düşük kullanım maliyeti arayan kullanıcılar için ayrı bir keşif alanı sunar. İlan detaylarında fiyat, yıl, kilometre ve teknik bilgileri karşılaştırabilirsiniz."
};

export const automaticCarsSeoConfig: MarketplaceSeoConfig = {
  path: "/otomatik-vites-araclar",
  h1: "Otomatik vites araba ilanları",
  description: "Otomatik vites araç ilanlarını fiyat, şehir, marka ve model seçenekleriyle karşılaştırın.",
  ctaLabel: "Otomatik vites araçları gör",
  filters: { transmission: "automatic" },
  breadcrumbs: [
    { label: "Ana sayfa", href: "/" },
    { label: "Otomatik vites araba ilanları" }
  ],
  summary: [
    { label: "Vites", value: "Otomatik" },
    { label: "Kapsam", value: "Türkiye" }
  ],
  seoText: "Otomatik vites araç ilanları, konforlu sürüş ve şehir içi kullanım kolaylığı arayanlar için filtrelenmiş bir başlangıç noktasıdır. Daha fazla seçenek için arama sayfasındaki filtreleri kullanabilirsiniz."
};

export const suvCarsSeoConfig: MarketplaceSeoConfig = {
  path: "/suv-araclar",
  h1: "SUV araç ilanları",
  description: "SUV araç ilanlarını şehir, fiyat, marka, model ve teknik özelliklere göre inceleyin.",
  ctaLabel: "SUV araçları gör",
  filters: { bodyType: "suv" },
  breadcrumbs: [
    { label: "Ana sayfa", href: "/" },
    { label: "SUV araç ilanları" }
  ],
  summary: [
    { label: "Kasa tipi", value: "SUV" },
    { label: "Kapsam", value: "Türkiye" }
  ],
  seoText: "SUV araç ilanları, geniş iç hacim ve yüksek sürüş pozisyonu arayan kullanıcılar için pratik bir keşif sayfasıdır. Marka, model, şehir ve fiyat filtreleriyle sonuçları daraltabilirsiniz."
};
