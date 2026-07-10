import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const metadata = buildSeoMetadata({
  title: "OTOYALI Güven Merkezi",
  description: "OTOYALI güven merkezi, ilan kalitesi, şikayetler, fiyat analizi ve gelecek doğrulama özellikleri.",
  path: "/trust"
});

const sections: LegalSection[] = [
  {
    title: "Güvenli araç alışverişi",
    body: "OTOYALI kullanıcıların daha bilinçli karar vermesine yardımcı olur. Yine de araç alım satımı öncesinde resmi belgeler, ödeme süreci, ekspertiz ve satıcı bilgileri ayrıca kontrol edilmelidir."
  },
  {
    title: "İlan kalitesi",
    body: "İlan alanları, medya yükleme, fiyat analizi ve moderasyon temelleri ilanların daha anlaşılır ve karşılaştırılabilir olmasını hedefler."
  },
  {
    title: "Satıcı profilleri",
    body: "Satıcı profilleri kullanıcıya bağlam sunar. OTOYALI her satıcının geçmişini veya yetkili temsil durumunu otomatik olarak garanti etmez."
  },
  {
    title: "Şikayet ve bildirimler",
    body: "Kullanıcılar şüpheli ilanları bildirebilir. Bildirimler ekip tarafından incelenebilir; ancak tüm risklerin önceden tespit edileceği söylenemez."
  },
  {
    title: "Araç geçmişi hakkında not",
    body: "TRAMER/SBM, sigorta kayıtları, ekspertiz kayıtları veya resmi geçmiş sorguları şu anda aktif entegrasyon olarak sunulmaz."
  },
  {
    title: "OTOYALI Güven Raporu",
    body: "Güven raporu gelecek aşamalar için planlanan bir özelliktir. Hasar, sigorta ödemesi, kilometre tutarlılığı ve kısıtlama kontrolleri aktifmiş gibi gösterilmez."
  },
  {
    title: "Fiyat analizi",
    body: "Mevcut fiyat analizi sınırlı ilan verisiyle çalışır ve kesin değerleme değildir. Benzer ilan sayısı yeterli değilse güvenli boş durum gösterilir."
  },
  {
    title: "Medya güvenliği",
    body: "Fotoğraf ve videolar satıcı tarafından sağlanır. Plaka veya kişisel bilgi gizlemek isteyen kullanıcıların medyayı yüklemeden önce düzenlemesi önerilir."
  },
  {
    title: "Gelecek entegrasyonlar",
    body: "OTOYALI ileride ekspertiz, sigorta, TRAMER/SBM, gelişmiş medya işleme ve AI destekli güven kontrolleri sunmayı hedefleyebilir."
  }
];

export default function TrustPage() {
  return (
    <LegalPage
      title="OTOYALI Güven Merkezi"
      description="OTOYALI’nin güven yaklaşımını, mevcut sınırlarını ve gelecekte planlanan doğrulama alanlarını şeffaf biçimde açıklar."
      sections={sections}
      actions={[
        { href: "/listing-rules", label: "İlan Kuralları" },
        { href: "/moderation-policy", label: "Moderasyon Politikası" }
      ]}
      disclaimer="OTOYALI, gelecek aşamalarda ek doğrulama ve veri entegrasyonları sunmayı hedefler. Bir araç satın almadan önce resmi belgeleri, ekspertiz raporlarını ve satıcı bilgilerini ayrıca kontrol etmeniz önerilir."
    />
  );
}
