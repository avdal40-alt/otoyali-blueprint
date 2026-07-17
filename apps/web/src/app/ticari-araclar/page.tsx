import { FutureVerticalPage } from "@/components/verticals/FutureVerticalPage";
import { buildVerticalSeoMetadata } from "@/lib/marketplace/vertical-seo";

export function generateMetadata() {
  return buildVerticalSeoMetadata("commercial");
}

export default function CommercialVehiclesPage() {
  return <FutureVerticalPage verticalId="commercial" />;
}
