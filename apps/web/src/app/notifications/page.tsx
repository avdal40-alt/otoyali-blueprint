import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/States";

export default function NotificationsPage() {
  return (
    <>
      <AppHeader />
      <PageContainer>
        <SectionHeader title="Bildirimler" eyebrow="Hesabim" />
        <EmptyState title="Bildirim yok" body="Onemli ilan ve hesap bildirimleri burada gorunecek." />
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
