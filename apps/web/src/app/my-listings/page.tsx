import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { MyListingsClient } from "@/app/profile/listings/_components/MyListingsClient";

export default function MyListingsPage() {
  return (
    <>
      <AppHeader />
      <PageContainer>
        <SectionHeader title="İlanlarım" eyebrow="Hesabım" />
        <MyListingsClient />
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
