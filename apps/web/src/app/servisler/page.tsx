import { FutureVerticalPage } from "@/components/verticals/FutureVerticalPage";
import { buildVerticalSeoMetadata } from "@/lib/marketplace/vertical-seo";

export function generateMetadata() {
  return buildVerticalSeoMetadata("services");
}

export default function ServicesPage() {
  return <FutureVerticalPage verticalId="services" />;
}
