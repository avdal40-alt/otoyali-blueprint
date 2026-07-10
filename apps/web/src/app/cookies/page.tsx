import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const metadata = buildSeoMetadata({
  title: "Çerez Politikası",
  description: "OTOYALI çerez politikası ve oturum, güvenlik, tercih, analitik kullanımı hakkında MVP bilgilendirmesi.",
  path: "/cookies"
});

const sections: LegalSection[] = [
  {
    title: "Çerez nedir?",
    body: "Çerezler ve benzeri yerel depolama teknolojileri, web sitesinin cihazınızda küçük bilgiler tutmasını sağlar. Bu bilgiler oturum, güvenlik, tercih ve ürün deneyimi için kullanılabilir."
  },
  {
    title: "Zorunlu çerezler",
    body: "Giriş, oturum güvenliği, yönlendirme, tercihlerin korunması ve temel site işlevlerinin çalışması için zorunlu çerezler veya yerel depolama kullanılabilir."
  },
  {
    title: "Oturum ve güvenlik",
    body: "Telefonla giriş, OTP doğrulama ve korumalı sayfalara erişim gibi işlemlerde oturum bilgisinin güvenli şekilde yönetilmesi gerekir."
  },
  {
    title: "Analitik çerezler",
    body: "MVP aşamasında ürün performansını ve kullanım akışlarını iyileştirmek için sınırlı analitik kullanılabilir. Reklam takibi aktifse ayrıca açık bilgilendirme yapılmalıdır."
  },
  {
    title: "Tercih çerezleri",
    body: "Arama, filtre, dil, şehir veya benzeri kullanıcı tercihleri deneyimi kolaylaştırmak için cihazda saklanabilir."
  },
  {
    title: "Çerezleri nasıl yönetebilirsiniz?",
    body: "Tarayıcı ayarlarınızdan çerezleri silebilir veya engelleyebilirsiniz. Zorunlu çerezleri kapatmak giriş, yayınlama veya güvenlik akışlarının çalışmasını etkileyebilir."
  },
  {
    title: "Gelecek kullanım",
    body: "İleride reklam, gelişmiş analitik veya pazarlama çerezleri eklenirse kullanıcılar uygun şekilde bilgilendirilecek ve gerekli kontroller sağlanacaktır."
  },
  {
    title: "İletişim",
    body: "Çerez kullanımıyla ilgili sorular için İletişim sayfasındaki destek yönlendirmelerini kullanabilirsiniz."
  }
];

export default function CookiesPage() {
  return (
    <LegalPage
      title="Çerez Politikası"
      description="OTOYALI’de çerezlerin ve yerel depolama teknolojilerinin neden kullanılabileceğini açıklar."
      sections={sections}
      actions={[
        { href: "/privacy", label: "Gizlilik Politikası" },
        { href: "/contact", label: "İletişim" }
      ]}
    />
  );
}
