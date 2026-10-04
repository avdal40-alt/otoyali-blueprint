import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const metadata = buildSeoMetadata({
  title: "İletişim",
  description: "Yolmod destek, ilan bildirimi ve hukuki iletişim talepleri için iletişim sayfası.",
  path: "/contact"
});

const sections: LegalSection[] = [
  {
    title: "Platform desteği",
    body: "Yolmod kullanımı, hesap erişimi, ilan görüntüleme ve genel platform soruları için support@yolmod.com adresine yazabilirsiniz."
  },
  {
    title: "İlan ve bildirim yardımı",
    body: "Şüpheli bir ilan gördüğünüzde ilan detayındaki bildirim alanını kullanabilirsiniz. Bildirimler moderasyon sürecine alınabilir."
  },
  {
    title: "Galeri erişimi",
    body: "Galeri erişimi davetle verilir; doğrulama yalnızca platform incelemesinden sonra atanır."
  },
  {
    title: "Hukuki iletişim talepleri",
    body: "Hukuki bildirimler, gizlilik talepleri ve platform politikalarıyla ilgili başvurular için legal@yolmod.com adresine yazabilirsiniz."
  },
  {
    title: "Genel iletişim",
    body: "Genel destek talepleri için support@yolmod.com adresini kullanabilirsiniz."
  },
  {
    title: "Güvenli iletişim notu",
    body: "Yolmod dışındaki ödeme, kapora, belge paylaşımı veya kimlik doğrulama taleplerinde dikkatli olun. Şüpheli durumlarda işlem yapmadan önce ilanı bildirin."
  }
];

export default function ContactPage() {
  return (
    <LegalPage
      title="İletişim"
      description="Destek, ilan bildirimi ve hukuki talepler için Yolmod iletişim yönlendirmeleri."
      sections={sections}
      actions={[
        { href: "/search", label: "İlanları keşfet", variant: "primary" },
        { href: "/trust", label: "Güven Merkezi" },
        { href: "/listing-rules", label: "Kuralları incele" }
      ]}
    />
  );
}
