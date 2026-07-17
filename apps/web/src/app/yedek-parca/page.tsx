import { FutureVerticalPage } from "@/components/verticals/FutureVerticalPage";
import { buildVerticalSeoMetadata } from "@/lib/marketplace/vertical-seo";

export function generateMetadata() {
  return buildVerticalSeoMetadata("parts");
}

export default function SparePartsPage() {
  return <FutureVerticalPage verticalId="parts" />;
}
