import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { DealerCrmAnalyticsClient } from "./_components/DealerCrmAnalyticsClient";

export default function DealerCrmPage() {
  return (
    <>
      <AppHeader />
      <PageContainer>
        <SectionHeader title="Dealer CRM" eyebrow="Pipeline analytics" />
        <DealerCrmAnalyticsClient />
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
