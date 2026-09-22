import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { SavedSearchesClient } from "./_components/SavedSearchesClient";

export default function SavedSearchesPage() {
  return <><AppHeader /><PageContainer><SavedSearchesClient /></PageContainer><MarketplaceFooter /><MobileBottomNav /></>;
}
