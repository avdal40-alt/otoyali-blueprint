import { FutureVerticalPage } from "@/components/verticals/FutureVerticalPage";
import { buildVerticalSeoMetadata } from "@/lib/marketplace/vertical-seo";

export function generateMetadata() {
  return buildVerticalSeoMetadata("insurance");
}

export default function InsurancePage() {
  return <FutureVerticalPage verticalId="insurance" />;
}
