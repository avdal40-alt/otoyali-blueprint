import { FutureVerticalPage } from "@/components/verticals/FutureVerticalPage";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const metadata = buildSeoMetadata({
  title: "OTOYALI AI Asistan | OTOYALI",
  description: "Araç bulma, ilan karşılaştırma, fiyat yorumlama ve ilan açıklaması hazırlama desteği yakında.",
  path: "/ai-asistan"
});

export default function AiAssistantPage() {
  return (
    <FutureVerticalPage
      title="OTOYALI AI Asistan"
      description="Araç bulma, ilan karşılaştırma, fiyat yorumlama ve ilan açıklaması hazırlama desteği yakında."
      ctaLabel="İlanları keşfet"
      sections={["AI ile araç bul", "Bu ilanı özetle", "Benim için karşılaştır", "İlan açıklamasını iyileştir", "Fiyatı yorumla"]}
    />
  );
}
