import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { FavoritesClient } from "./_components/FavoritesClient";

export default function FavoritesPage() {
  return (
    <>
      <AppHeader />
      <PageContainer>
        <SectionHeader title="Favoriler" eyebrow="Hesabim" />
        <FavoritesClient />
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
