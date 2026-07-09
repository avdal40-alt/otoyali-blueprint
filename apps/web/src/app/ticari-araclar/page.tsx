import { FutureVerticalPage } from "@/components/verticals/FutureVerticalPage";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const metadata = buildSeoMetadata({
  title: "Ticari Araçlar | OTOYALI",
  description: "Kamyonet, kamyon, minibüs, otobüs, çekici ve iş makineleri için OTOYALI yakında yeni bir pazar alanı sunacak.",
  path: "/ticari-araclar"
});

export default function CommercialVehiclesPage() {
  return (
    <FutureVerticalPage
      title="Ticari araçlar"
      description="Kamyonet, kamyon, minibüs, otobüs, çekici ve iş makineleri için OTOYALI yakında yeni bir pazar alanı sunacak."
      ctaLabel="Otomobil ilanlarını incele"
      sections={["Hafif ticari", "Kamyon", "Kamyonet", "Minibüs", "Otobüs", "Çekici", "Dorse", "İş makineleri", "Tarım makineleri"]}
    />
  );
}
