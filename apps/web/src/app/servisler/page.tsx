import { FutureVerticalPage } from "@/components/verticals/FutureVerticalPage";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const metadata = buildSeoMetadata({
  title: "Servisler | OTOYALI",
  description: "Ekspertiz, bakım, onarım ve araç hizmetleri için güvenilir servis seçenekleri yakında OTOYALI'de.",
  path: "/servisler"
});

export default function ServicesPage() {
  return (
    <FutureVerticalPage
      title="Servisler"
      description="Ekspertiz, bakım, onarım ve araç hizmetleri için güvenilir servis seçenekleri yakında OTOYALI'de."
      ctaLabel="Araç ilanlarını keşfet"
      sections={["Ekspertiz", "Periyodik bakım", "Lastik değişimi", "Kaporta boya", "Elektrikli araç servisi"]}
    />
  );
}
