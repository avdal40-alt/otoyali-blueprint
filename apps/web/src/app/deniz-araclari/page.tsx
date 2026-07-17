import { FutureVerticalPage } from "@/components/verticals/FutureVerticalPage";
import { buildVerticalSeoMetadata } from "@/lib/marketplace/vertical-seo";

export function generateMetadata() {
  return buildVerticalSeoMetadata("marine");
}

export default function MarineVehiclesPage() {
  return <FutureVerticalPage verticalId="marine" />;
}
