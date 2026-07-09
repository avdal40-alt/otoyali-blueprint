import { FutureVerticalPage } from "@/components/verticals/FutureVerticalPage";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const metadata = buildSeoMetadata({
  title: "Deniz Araçları | OTOYALI",
  description: "Tekne, yat, bot, jet ski ve deniz motoru ilanları için OTOYALI Deniz yakında.",
  path: "/deniz-araclari"
});

export default function MarineVehiclesPage() {
  return (
    <FutureVerticalPage
      title="Deniz araçları"
      description="Tekne, yat, bot, jet ski ve deniz motoru ilanları için OTOYALI Deniz yakında."
      ctaLabel="Otomobil ilanlarını incele"
      sections={["Tekne", "Yat", "Bot", "Jet ski", "Deniz motoru", "Römork"]}
    />
  );
}
