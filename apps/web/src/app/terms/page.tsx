import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { buildSeoMetadata } from "@/lib/seo/metadata";
import { getRequestLocale } from "@/i18n/server";

export const metadata = buildSeoMetadata({
  title: "Kullanım Şartları",
  description: "Yolmod platform kullanım şartları, ilan yayınlama sorumlulukları ve moderasyon kuralları.",
  path: "/terms"
});

const sections: LegalSection[] = [
  {
    title: "Yolmod nedir?",
    body: "Yolmod, kullanıcıların araç ilanlarını keşfetmesine, aramasına, incelemesine ve yayınlamasına yardımcı olan bir dijital platformdur."
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
    body: "Yolmod, ilanları kullanıcıların sunduğu bilgilere göre gösterir. Platform her aracın geçmişini, teknik durumunu veya satışa uygunluğunu otomatik olarak garanti etmez."
  },
  {
    title: "Ücretli hizmetler hakkında not",
    body: "Öne çıkarma, reklam, paket veya ödeme temelli hizmetler ileride eklenebilir. Bu hizmetler aktif hale gelirse ayrı bilgilendirme ve koşullar yayınlanacaktır."
  },
  {
    title: "İlanların kaldırılması ve moderasyon",
    body: "Yolmod; şüpheli, yanıltıcı, yasaklı veya kullanıcı güvenliğini riske atabilecek ilanları reddedebilir, arşivleyebilir ya da kaldırabilir."
  },
  {
    title: "Değişiklikler",
    body: "Platform geliştikçe bu kullanım şartları güncellenebilir. Önemli değişiklikler makul yöntemlerle kullanıcılara duyurulacaktır."
  },
  {
    title: "İletişim",
    body: "Kullanım şartlarıyla ilgili sorular için legal@yolmod.com, platform desteği için support@yolmod.com adresini kullanabilirsiniz."
  }
];

const enSections: LegalSection[] = [
  {
    title: "What is Yolmod?",
    body: "Yolmod is a digital platform for browsing, searching, viewing, and publishing vehicle listings."
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
    body: "Yolmod displays listings based on user-provided information. The platform does not automatically guarantee each vehicle's history, technical condition, or sale eligibility."
  },
  {
    title: "Moderation",
    body: "Yolmod may reject, archive, or remove listings that appear suspicious, misleading, prohibited, or risky for user safety."
  }
];

export default async function TermsPage() {
  const locale = await getRequestLocale();
  const isEnglish = locale === "en";

  return (
    <LegalPage
      title={isEnglish ? "Terms of Use" : "Kullanım Şartları"}
      description={
        isEnglish
          ? "Yolmod Terms of Use explain platform usage, user responsibilities, and safety boundaries."
          : "Yolmod kullanım şartları; platformun nasıl kullanılacağını, kullanıcı sorumluluklarını ve güvenlik sınırlarını açıklar."
      }
      sections={isEnglish ? enSections : sections}
      actions={[
        { href: "/listing-rules", label: isEnglish ? "Review listing rules" : "İlan kurallarını incele" },
        { href: "/contact", label: isEnglish ? "Contact" : "İletişim" }
      ]}
    />
  );
}
