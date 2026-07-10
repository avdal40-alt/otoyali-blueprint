import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const metadata = buildSeoMetadata({
  title: "Moderasyon Politikası",
  description: "OTOYALI ilan, video ve şikayet moderasyonu için MVP politika açıklaması.",
  path: "/moderation-policy"
});

const sections: LegalSection[] = [
  {
    title: "Moderasyon amacı",
    body: "Moderasyonun amacı kullanıcı güvenini korumak, yanıltıcı ilanları azaltmak ve platform kalitesini sürdürülebilir şekilde artırmaktır."
  },
  {
    title: "İncelenen içerikler",
    body: "İlan başlıkları, açıklamalar, fiyat bilgisi, araç alanları, fotoğraflar, videolar, satıcı profilleri ve kullanıcı şikayetleri incelenebilir."
  },
  {
    title: "İlan moderasyonu",
    body: "WEB-10 temel akışlarıyla uyumlu olarak ilanlar pending, approved, rejected veya archived durumlarında yönetilebilir."
  },
  {
    title: "Video moderasyonu",
    body: "OTOYALI Video içerikleri yayınlanmadan önce beklemede tutulabilir. Uygunsuz, yanıltıcı veya güvenliği riske atan videolar reddedilebilir ya da arşivlenebilir."
  },
  {
    title: "Şikayetler",
    body: "Kullanıcı bildirimleri open, reviewing, resolved veya dismissed durumlarıyla takip edilebilir. Her şikayet aynı sonucu doğurmaz ve anlık inceleme süresi garanti edilmez."
  },
  {
    title: "Olası aksiyonlar",
    items: [
      "İçeriği onaylama veya yayında bırakma.",
      "İlanı ya da videoyu reddetme, arşivleme veya kaldırma.",
      "İleride düzeltme isteme, şüpheli içeriği kısıtlama veya hesabı incelemeye alma."
    ]
  },
  {
    title: "İtiraz ve iletişim",
    body: "Kullanıcılar moderasyon kararlarıyla ilgili destek talebi iletebilir. MVP aşamasında itiraz süreçleri manuel değerlendirilebilir."
  },
  {
    title: "Güvenlik notu",
    body: "Moderasyon kötüye kullanımı azaltmayı hedefler; ancak tüm dolandırıcılık, hata veya yanıltıcı davranışların otomatik olarak tespit edileceği garanti edilmez."
  }
];

export default function ModerationPolicyPage() {
  return (
    <LegalPage
      title="Moderasyon Politikası"
      description="OTOYALI’de ilan, video ve şikayetlerin hangi ilkelerle incelenebileceğini açıklar."
      sections={sections}
      actions={[
        { href: "/listing-rules", label: "İlan Kuralları" },
        { href: "/contact", label: "İletişim" }
      ]}
    />
  );
}
