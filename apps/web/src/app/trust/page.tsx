import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import { getRequestLocale } from "@/i18n/server";

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

const enSections: LegalSection[] = [
  {
    title: "Safer vehicle shopping",
    body: "OTOYALI helps users make more informed decisions. Buyers should still check official documents, payment steps, inspection reports, and seller information before a transaction."
  },
  {
    title: "Listing quality",
    body: "Listing fields, media upload, price analysis, and moderation foundations are designed to make listings easier to understand and compare."
  },
  {
    title: "Seller profiles",
    body: "Seller profiles provide context. OTOYALI does not automatically guarantee each seller's history or official representative status."
  },
  {
    title: "Reports and complaints",
    body: "Users can report suspicious listings. Reports may be reviewed by the team, but OTOYALI does not claim that every risk can be detected in advance."
  },
  {
    title: "Vehicle history note",
    body: "TRAMER/SBM, insurance records, inspection records, or official history checks are not currently offered as active integrations."
  },
  {
    title: "OTOYALI Trust Report",
    body: "The trust report is planned for a future phase. Damage, insurance payment, mileage consistency, and restriction checks are not shown as active checks today."
  },
  {
    title: "Price analysis",
    body: "Current price analysis uses limited listing data and is not a guaranteed valuation. If comparable data is insufficient, a safe empty state is shown."
  }
];

export default function TrustPage() {
  const locale = getRequestLocale();
  const isEnglish = locale === "en";

  return (
    <LegalPage
      title={isEnglish ? "OTOYALI Trust Center" : "OTOYALI Güven Merkezi"}
      description={
        isEnglish
          ? "A transparent overview of OTOYALI's trust approach, current limitations, and future verification areas."
          : "OTOYALI’nin güven yaklaşımını, mevcut sınırlarını ve gelecekte planlanan doğrulama alanlarını şeffaf biçimde açıklar."
      }
      sections={isEnglish ? enSections : sections}
      actions={[
        { href: "/listing-rules", label: isEnglish ? "Listing Rules" : "İlan Kuralları" },
        { href: "/moderation-policy", label: isEnglish ? "Moderation Policy" : "Moderasyon Politikası" }
      ]}
      disclaimer={
        isEnglish
          ? "OTOYALI may add verification and data integrations in future stages. Before buying a vehicle, users should independently check official documents, inspection reports, and seller information."
          : "OTOYALI, gelecek aşamalarda ek doğrulama ve veri entegrasyonları sunmayı hedefler. Bir araç satın almadan önce resmi belgeleri, ekspertiz raporlarını ve satıcı bilgilerini ayrıca kontrol etmeniz önerilir."
      }
    />
  );
}
