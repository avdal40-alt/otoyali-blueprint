import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const metadata = buildSeoMetadata({
  title: "Gizlilik Politikası",
  description: "Yolmod gizlilik politikası, işlenen veri türleri ve kullanıcı hakları hakkında genel bilgilendirme.",
  path: "/privacy"
});

const sections: LegalSection[] = [
  {
    title: "Hangi veriler işlenir?",
    body: "Yolmod, hesap oluşturma, kimlik doğrulama, ilan yayınlama, güvenlik, moderasyon ve ürün geliştirme için gerekli minimum verileri işler."
  },
  {
    title: "Hesap ve iletişim bilgileri",
    body: "Telefon numarası giriş ve OTP doğrulama süreçlerinde kullanılabilir. Profil adı, şehir ve satıcı tipi gibi bilgiler kullanıcı deneyimi ve ilan güveni için saklanabilir."
  },
  {
    title: "İlan verileri",
    body: "Marka, model, yıl, kilometre, fiyat, açıklama, şehir, satıcı tipi ve benzeri ilan bilgileri yayınlanan ilanın parçası olarak herkese açık görünebilir."
  },
  {
    title: "Fotoğraf ve medya verileri",
    body: "Kullanıcının yüklediği ilan fotoğrafları ve videoları, ilan yayına alındığında herkese açık görüntülenebilir. Plaka veya kişisel detayların paylaşımından önce kullanıcıların medyayı kontrol etmesi önerilir."
  },
  {
    title: "Kullanım ve analiz verileri",
    body: "Platform performansını, hata durumlarını, arama deneyimini ve kullanıcı akışlarını iyileştirmek için sınırlı kullanım ve teknik analiz verileri işlenebilir."
  },
  {
    title: "Çerezler",
    body: "Oturum, güvenlik, tercih ve ileride ürün analitiği için çerez veya benzeri yerel depolama teknolojileri kullanılabilir. Detaylar Çerez Politikası sayfasında açıklanır."
  },
  {
    title: "Verilerin kullanım amaçları",
    items: [
      "Kullanıcı girişini, ilan yayınlama akışını ve profil işlemlerini çalıştırmak.",
      "İlan, medya, şikayet ve moderasyon süreçlerini yönetmek.",
      "Güvenlik, hata analizi, ürün iyileştirme ve kötüye kullanım önleme çalışmaları yapmak."
    ]
  },
  {
    title: "Verilerin paylaşımı",
    body: "Hosting, veritabanı, kimlik doğrulama, depolama, analitik ve güvenlik gibi altyapı hizmetleri için üçüncü taraf sağlayıcılar kullanılabilir. Yolmod hizmeti çalıştırmak için gerekli olmayan verileri satmaz."
  },
  {
    title: "Saklama süresi",
    body: "Veriler, hizmetin sunulması, güvenlik, yasal yükümlülükler ve makul ürün operasyonu için gerekli olduğu sürece saklanır. Silme ve anonimleştirme süreçleri ürün olgunlaştıkça netleştirilecektir."
  },
  {
    title: "Kullanıcı hakları",
    body: "Kullanıcılar kişisel verileri hakkında bilgi alma, düzeltme, silme veya işleme faaliyetleriyle ilgili taleplerini iletme hakkına sahip olabilir. Talepler legal@yolmod.com adresine iletilebilir."
  },
  {
    title: "MVP bilgilendirme notu",
    body: "Bu metin platformun veri işleme yaklaşımına ilişkin genel bilgilendirme sağlar."
  },
  {
    title: "İletişim",
    body: "Gizlilik ve veri işleme konularındaki talepler için legal@yolmod.com adresini kullanabilirsiniz."
  }
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Gizlilik Politikası"
      description="Yolmod&apos;un hangi verileri neden işlediğini ve kullanıcıların nelere dikkat etmesi gerektiğini sade biçimde açıklar."
      sections={sections}
      actions={[
        { href: "/cookies", label: "Çerez Politikası" },
        { href: "/contact", label: "İletişim" }
      ]}
    />
  );
}
