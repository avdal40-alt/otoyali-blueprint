import { FutureVerticalPage } from "@/components/verticals/FutureVerticalPage";
import { buildSeoMetadata } from "@/lib/seo/metadata";

export const metadata = buildSeoMetadata({
  title: "Sigorta | OTOYALI",
  description: "Zorunlu trafik sigortası ve kasko tekliflerini karşılaştırmak için OTOYALI Sigorta yakında.",
  path: "/sigorta"
});

export default function InsurancePage() {
  return (
    <FutureVerticalPage
      title="Sigorta"
      description="Zorunlu trafik sigortası ve kasko tekliflerini karşılaştırmak için OTOYALI Sigorta yakında."
      ctaLabel="Araç ilanlarını keşfet"
      sections={["Trafik sigortası", "Kasko", "Hasar geçmişi", "Sigorta teklifleri"]}
    />
  );
}
