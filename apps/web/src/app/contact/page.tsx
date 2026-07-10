import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const metadata = buildSeoMetadata({
  title: "İletişim",
  description: "OTOYALI destek, ilan bildirimi, iş birliği ve hukuki iletişim talepleri için MVP iletişim sayfası.",
  path: "/contact"
});

const sections: LegalSection[] = [
  {
    title: "Platform desteği",
    body: "OTOYALI kullanımı, hesap erişimi, ilan görüntüleme ve genel platform soruları için resmi destek kanalı yayın öncesinde netleştirilecektir."
  },
  {
    title: "İlan ve bildirim yardımı",
    body: "Şüpheli bir ilan gördüğünüzde ilan detayındaki bildirim alanını kullanabilirsiniz. Bildirimler moderasyon sürecine alınabilir."
  },
  {
    title: "İş birliği talepleri",
    body: "Galeri, servis, sigorta, ekspertiz, medya veya ulaşım ekosistemi iş birlikleri için resmi iş ortaklığı kanalı yayına hazırlık sürecinde eklenecektir."
  },
  {
    title: "Hukuki iletişim talepleri",
    body: "Hukuki bildirimler, gizlilik talepleri ve platform politikalarıyla ilgili başvurular için resmi iletişim yöntemi yayın öncesinde duyurulacaktır."
  },
  {
    title: "Genel iletişim formu",
    body: "Bu MVP sürümünde gerçek bir iletişim formu veya e-posta gönderimi bulunmaz. Resmi destek e-posta adresi yayın öncesinde eklenecektir."
  },
  {
    title: "Güvenli iletişim notu",
    body: "OTOYALI dışındaki ödeme, kapora, belge paylaşımı veya kimlik doğrulama taleplerinde dikkatli olun. Şüpheli durumlarda işlem yapmadan önce ilanı bildirin."
  }
];

export default function ContactPage() {
  return (
    <LegalPage
      title="İletişim"
      description="Destek, ilan bildirimi, iş birliği ve hukuki talepler için OTOYALI iletişim yönlendirmeleri."
      sections={sections}
      actions={[
        { href: "/search", label: "İlanları keşfet", variant: "primary" },
        { href: "/trust", label: "Güven Merkezi" },
        { href: "/listing-rules", label: "Kuralları incele" }
      ]}
    />
  );
}
