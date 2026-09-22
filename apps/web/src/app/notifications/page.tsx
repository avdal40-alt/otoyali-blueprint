import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { NotificationsClient } from "./_components/NotificationsClient";

export default function NotificationsPage() {
  return (
    <>
      <AppHeader />
      <PageContainer>
        <NotificationsClient />
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
