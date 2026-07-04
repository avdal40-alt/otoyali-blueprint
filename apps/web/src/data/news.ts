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
    title: "Türkiye'de elektrikli araç ilgisi artıyor",
    excerpt: "Yeni modeller, şarj ağı yatırımları ve düşen kullanım maliyetleri pazarı hızlandırıyor.",
    category: "Elektrikli",
    publishedAt: "2026-07-01",
    imageUrl: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1200&q=80",
    body: [
      "Elektrikli araçlar Türkiye'de sadece teknoloji meraklılarının değil, ailelerin ve filo kullanıcılarının da gündemine giriyor.",
      "Şarj altyapısının genişlemesi, daha uzun menzilli modeller ve toplam sahip olma maliyetindeki avantajlar bu ilgiyi destekliyor.",
      "OTOYALI, kullanıcıların araçları sadece fiyatla değil, kullanım ihtiyacı ve güven unsurlarıyla birlikte değerlendirmesini hedefler."
    ]
  },
  {
    slug: "ikinci-el-arac-alirken-kontrol-listesi",
    title: "İkinci el araç alırken sade kontrol listesi",
    excerpt: "İlk görüşmeden ekspertize kadar dikkat edilmesi gereken temel noktalar.",
    category: "Rehber",
    publishedAt: "2026-06-30",
    imageUrl: "https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1200&q=80",
    body: [
      "İkinci el araç alırken ilanın tutarlılığı, bakım kayıtları, kilometre bilgisi ve fotoğraf kalitesi ilk sinyalleri verir.",
      "Görüşme öncesi fiyat aralığı, model yılı ve motor seçeneklerini karşılaştırmak karar sürecini hızlandırır.",
      "Görüşmeden sonra ekspertiz, noter süreci ve ödeme güvenliği adım adım ilerlemelidir."
    ]
  },
  {
    slug: "sehir-ici-kullanim-icin-dogru-arac",
    title: "Şehir içi kullanım için doğru araç nasıl seçilir?",
    excerpt: "Yakıt, boyut, park kolaylığı ve güvenlik donanımları arasında denge kurun.",
    category: "Piyasa",
    publishedAt: "2026-06-28",
    imageUrl: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80",
    body: [
      "Şehir içinde kullanılacak araçlarda sadece fiyat değil, yakıt tüketimi, donanım ve park kolaylığı da önemlidir.",
      "Kompakt hatchback, sedan ve küçük SUV modeller farklı ihtiyaçlara cevap verir.",
      "OTOYALI arama deneyimi, kullanıcının ihtiyacına göre filtreleme yapmasını kolaylaştıracak şekilde tasarlanır."
    ]
  }
];

export function getArticle(slug: string) {
  return newsArticles.find((article) => article.slug === slug) ?? null;
}
