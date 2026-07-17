import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { getCities } from "@/lib/queries/cities";
import { getRequestLocale } from "@/i18n/server";
import { ProfileClient } from "./_components/ProfileClient";

export default async function ProfilePage() {
  getRequestLocale();
  const citiesResult = await getCities();

  return (
    <>
      <AppHeader />
      <PageContainer>
        <ProfileClient cities={citiesResult.data} />
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
