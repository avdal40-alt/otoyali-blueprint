export type NewsArticle = {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  publishedAt: string;
  imageUrl: string;
  body: string[];
};

export const newsArticles: NewsArticle[] = [
  {
    slug: "turkiyede-elektrikli-arac-ilgisi-artiyor",
    title: "Turkiye'de elektrikli arac ilgisi artiyor",
    excerpt: "Yeni modeller, sarj agi yatirimlari ve dusen kullanim maliyetleri pazari hizlandiriyor.",
    category: "Elektrikli",
    publishedAt: "2026-07-01",
    imageUrl: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1200&q=80",
    body: [
      "Elektrikli araclar Turkiye'de sadece teknoloji meraklilarinin degil, ailelerin ve filo kullanicilarinin da gundemine giriyor.",
      "Sarj altyapisinin genislemesi, daha uzun menzilli modeller ve toplam sahip olma maliyetindeki avantajlar bu ilgiyi destekliyor.",
      "OTOYALI, kullanicilarin araclari sadece fiyatla degil, kullanim ihtiyaci ve guven unsurlariyla birlikte degerlendirmesini hedefler."
    ]
  },
  {
    slug: "ikinci-el-arac-alirken-kontrol-listesi",
    title: "Ikinci el arac alirken sade kontrol listesi",
    excerpt: "Ilk gorusmeden ekspertize kadar dikkat edilmesi gereken temel noktalar.",
    category: "Rehber",
    publishedAt: "2026-06-30",
    imageUrl: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1200&q=80",
    body: [
      "Ikinci el arac alirken ilanin tutarliligi, bakim kayitlari, kilometre bilgisi ve fotograf kalitesi ilk sinyalleri verir.",
      "Gorusme oncesi fiyat araligi, model yili ve motor seceneklerini karsilastirmak karar surecini hizlandirir.",
      "Gorusmeden sonra ekspertiz, noter sureci ve odeme guvenligi adim adim ilerlemelidir."
    ]
  },
  {
    slug: "sehir-ici-kullanim-icin-dogru-arac",
    title: "Sehir ici kullanim icin dogru arac nasil secilir?",
    excerpt: "Yakit, boyut, park kolayligi ve guvenlik donanimlari arasinda denge kurun.",
    category: "Piyasa",
    publishedAt: "2026-06-28",
    imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
    body: [
      "Sehir icinde kullanilacak araclarda sadece fiyat degil, yakit tuketimi, donanim ve park kolayligi da onemlidir.",
      "Kompakt hatchback, sedan ve kucuk SUV modeller farkli ihtiyaclara cevap verir.",
      "OTOYALI arama deneyimi, kullanicinin ihtiyacina gore filtreleme yapmasini kolaylastiracak sekilde tasarlanir."
    ]
  }
];

export function getArticle(slug: string) {
  return newsArticles.find((article) => article.slug === slug) ?? null;
}
