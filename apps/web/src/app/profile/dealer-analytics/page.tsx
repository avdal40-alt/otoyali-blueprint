import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { DealerCrossChannelAnalyticsClient } from "./_components/DealerCrossChannelAnalyticsClient";

export default function DealerAnalyticsPage() {
  return <><AppHeader /><PageContainer><SectionHeader title="Dealer analytics" eyebrow="Cross-channel performance" /><DealerCrossChannelAnalyticsClient /></PageContainer></>;
}
