import { FutureVerticalPage } from "@/components/verticals/FutureVerticalPage";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const metadata = buildSeoMetadata({
  title: "Yedek Parça | OTOYALI",
  description: "Araç yedek parçaları, lastik, jant, aksesuar ve bakım ürünleri için OTOYALI Parça yakında.",
  path: "/yedek-parca"
});

export default function SparePartsPage() {
  return (
    <FutureVerticalPage
      title="Yedek parça"
      description="Araç yedek parçaları, lastik, jant, aksesuar ve bakım ürünleri için OTOYALI Parça yakında."
      ctaLabel="Otomobil ilanlarını incele"
      sections={["Lastik ve jant", "Motor parçaları", "Kaporta", "Far / stop", "Elektronik", "Aksesuar", "İç döşeme"]}
    />
  );
}
