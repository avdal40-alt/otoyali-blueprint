import { AppHeader } from "@/components/layout/AppHeader";
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
    </>
  );
}
