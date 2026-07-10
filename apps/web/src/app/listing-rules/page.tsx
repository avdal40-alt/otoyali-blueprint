import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const metadata = buildSeoMetadata({
  title: "İlan Yayınlama Kuralları",
  description: "OTOYALI satıcıları için doğru bilgi, gerçek medya, yasaklı içerik ve güvenli satış kuralları.",
  path: "/listing-rules"
});

const sections: LegalSection[] = [
  {
    title: "Doğru ve güncel bilgi",
    body: "İlan başlığı, açıklama, fiyat, yıl, kilometre, şehir, yakıt tipi, vites, kasa tipi ve diğer alanlar gerçeğe uygun ve güncel olmalıdır."
  },
  {
    title: "Gerçek fotoğraf kullanımı",
    body: "Fotoğraflar ilandaki araca ait olmalı, üçüncü kişilerin haklarını ihlal etmemeli ve alıcıyı yanıltacak şekilde düzenlenmemelidir."
  },
  {
    title: "Fiyat bilgisi",
    body: "Fiyat gerçekçi, açık ve ilanla uyumlu olmalıdır. Alıcıyı yanıltan sembolik fiyat, manipülatif açıklama veya farklı kanala yönlendirme kullanılamaz."
  },
  {
    title: "Araç durumu ve hasar bilgisi",
    body: "Satıcı, bildiği önemli hasar, değişen parça, kilometre, kullanım durumu veya satış kararını etkileyebilecek bilgileri dürüstçe paylaşmalıdır."
  },
  {
    title: "Yasaklı ilanlar",
    items: [
      "Sahte ilan, dolandırıcılık amacı taşıyan içerik veya alakasız ürün yayınlanamaz.",
      "Çalıntı görsel, saldırgan metin, yasa dışı ürün ve yanıltıcı iletişim yönlendirmesi kullanılamaz.",
      "Araçla ilgisiz reklam, spam veya kullanıcıyı platform dışı riskli sürece zorlayan ilanlar kaldırılabilir."
    ]
  },
  {
    title: "Tekrarlanan ilanlar",
    body: "Aynı araç için gereksiz tekrar ilan, kopya açıklama veya arama sonuçlarını manipüle eden spam yayınlama davranışı kabul edilmez."
  },
  {
    title: "Galeri ve bireysel satıcı kuralları",
    body: "Satıcı tipi doğru seçilmeli, bireysel satıcı galeriyi taklit etmemeli, galeri satıcıları da kullanıcıyı yanıltacak kimlik veya iletişim bilgisi kullanmamalıdır."
  },
  {
    title: "Medya yükleme kuralları",
    body: "Fotoğraf ve videolarda yasa dışı, saldırgan veya kişisel güvenliği riske atabilecek içerik bulunmamalıdır. Plaka gizlemek isteyen kullanıcı medyayı yüklemeden önce düzenlemelidir."
  },
  {
    title: "İlan kaldırma ve hesap kısıtlamaları",
    body: "OTOYALI kuralları ihlal eden ilanları reddedebilir, arşivleyebilir, kaldırabilir veya ileride şüpheli hesaplara kısıtlama uygulayabilir."
  },
  {
    title: "Güvenli satış önerileri",
    body: "Araç teslimi, ödeme, ruhsat, noter işlemleri ve ekspertiz süreci kullanıcıların ayrıca kontrol etmesi gereken kritik adımlardır. Şüpheli taleplerde işlem durdurulmalıdır."
  }
];

export default function ListingRulesPage() {
  return (
    <LegalPage
      title="İlan Yayınlama Kuralları"
      description="OTOYALI’de yayınlanan ilanların doğru, güvenli ve kullanıcıya faydalı kalması için temel satıcı kuralları."
      sections={sections}
      actions={[
        { href: "/sell", label: "İlan yayınla", variant: "orange" },
        { href: "/moderation-policy", label: "Moderasyon Politikası" }
      ]}
    />
  );
}
