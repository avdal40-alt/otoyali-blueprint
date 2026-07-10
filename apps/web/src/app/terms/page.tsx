import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { buildSeoMetadata } from "@/lib/seo/metadata";

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

export default function TermsPage() {
  return (
    <LegalPage
      title="Kullanım Şartları"
      description="OTOYALI kullanım şartları; platformun nasıl kullanılacağını, kullanıcı sorumluluklarını ve MVP aşamasındaki güvenlik sınırlarını açıklar."
      sections={sections}
      actions={[
        { href: "/listing-rules", label: "İlan kurallarını incele" },
        { href: "/contact", label: "İletişim" }
      ]}
    />
  );
}
