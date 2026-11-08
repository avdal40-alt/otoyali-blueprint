import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { BuyerRequestsClient } from "./buyer-requests-client";

export default function BuyerRequestsPage() {
  return <><AppHeader /><BuyerRequestsClient /><MarketplaceFooter /><MobileBottomNav /></>;
}
