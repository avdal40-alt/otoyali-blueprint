import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import { getRequestLocale } from "@/i18n/server";

export const metadata = buildSeoMetadata({
  title: "Kullanım Şartları",
  description: "OTOYALI platform kullanım şartları, ilan yayınlama sorumlulukları ve moderasyon kuralları.",
  path: "/terms"
});

const sections: LegalSection[] = [
  {
    title: "OTOYALI nedir?",
    body: "OTOYALI, kullanıcıların ulaşım ve araç odaklı ihtiyaçlarını tek yerde çözmeyi hedefleyen bir dijital platformdur. MVP aşamasında temel odak araç ilanlarını keşfetmek, aramak, incelemek ve ilan yayınlamaktır."
  },
  {
    title: "Kullanıcı hesabı",
    body: "Araçları gezmek ve aramak için hesap gerekmez. İlan yayınlama, satıcıyla iletişime geçme, favori kaydetme ve profil işlemleri için giriş yapılması istenebilir."
  },
  {
    title: "İlan yayınlama",
    body: "İlanı yayınlayan kullanıcı; başlık, açıklama, fiyat, konum, kilometre, fotoğraf, video ve araç bilgilerinin doğru, güncel ve yanıltıcı olmamasından sorumludur."
  },
  {
    title: "Yasaklı içerikler",
    items: [
      "Sahte, yanıltıcı, izinsiz veya başkasına ait görsellerle oluşturulmuş ilanlar yayınlanamaz.",
      "Yasa dışı ürünler, ilgisiz ürünler, saldırgan içerikler ve dolandırıcılık amacı taşıyan yönlendirmeler kabul edilmez.",
      "Kilometre, yıl, hasar durumu, fiyat veya satıcı bilgilerini manipüle eden içerikler kaldırılabilir."
    ]
  },
  {
    title: "Kullanıcı sorumluluğu",
    body: "Alıcılar satın alma kararı vermeden önce aracı, resmi belgeleri, ekspertiz raporlarını, ödeme sürecini ve satıcı bilgilerini ayrıca kontrol etmelidir."
  },
  {
    title: "Platform sorumluluğu",
    body: "OTOYALI, ilanları kullanıcıların sunduğu bilgilere göre gösterir. Platform her aracın geçmişini, teknik durumunu veya satışa uygunluğunu otomatik olarak garanti etmez."
  },
  {
    title: "Ücretli hizmetler hakkında not",
    body: "Öne çıkarma, reklam, paket veya ödeme temelli hizmetler ileride eklenebilir. Bu hizmetler aktif hale gelirse ayrı bilgilendirme ve koşullar yayınlanacaktır."
  },
  {
    title: "İlanların kaldırılması ve moderasyon",
    body: "OTOYALI; şüpheli, yanıltıcı, yasaklı veya kullanıcı güvenliğini riske atabilecek ilanları reddedebilir, arşivleyebilir ya da kaldırabilir."
  },
  {
    title: "Değişiklikler",
    body: "Platform geliştikçe bu kullanım şartları güncellenebilir. Önemli değişiklikler makul yöntemlerle kullanıcılara duyurulacaktır."
  },
  {
    title: "İletişim",
    body: "Kullanım şartlarıyla ilgili sorular ve platform destek talepleri için İletişim sayfasındaki yönlendirmeler kullanılabilir."
  }
];

const enSections: LegalSection[] = [
  {
    title: "What is OTOYALI?",
    body: "OTOYALI is a digital platform designed to help users solve transport and vehicle-related tasks in one place. The MVP focuses on browsing, searching, viewing, and publishing vehicle listings."
  },
  {
    title: "User accounts",
    body: "Browsing and searching vehicles does not require an account. Login may be required for publishing a listing, contacting a seller, saving favorites, or managing a profile."
  },
  {
    title: "Publishing listings",
    body: "The seller is responsible for making sure the listing title, description, price, location, mileage, photos, videos, and vehicle details are accurate, current, and not misleading."
  },
  {
    title: "Prohibited content",
    items: [
      "Fake, misleading, unauthorized, or third-party images must not be used.",
      "Illegal products, irrelevant products, offensive content, and fraudulent redirections are not allowed.",
      "Content that manipulates mileage, year, damage status, price, or seller information may be removed."
    ]
  },
  {
    title: "Platform responsibility",
    body: "OTOYALI displays listings based on user-provided information. The platform does not automatically guarantee each vehicle's history, technical condition, or sale eligibility."
  },
  {
    title: "Moderation",
    body: "OTOYALI may reject, archive, or remove listings that appear suspicious, misleading, prohibited, or risky for user safety."
  }
];

export default function TermsPage() {
  const locale = getRequestLocale();
  const isEnglish = locale === "en";

  return (
    <LegalPage
      title={isEnglish ? "Terms of Use" : "Kullanım Şartları"}
      description={
        isEnglish
          ? "OTOYALI Terms of Use explain platform usage, user responsibilities, and MVP-stage safety boundaries."
          : "OTOYALI kullanım şartları; platformun nasıl kullanılacağını, kullanıcı sorumluluklarını ve MVP aşamasındaki güvenlik sınırlarını açıklar."
      }
      sections={isEnglish ? enSections : sections}
      actions={[
        { href: "/listing-rules", label: isEnglish ? "Review listing rules" : "İlan kurallarını incele" },
        { href: "/contact", label: isEnglish ? "Contact" : "İletişim" }
      ]}
    />
  );
}
