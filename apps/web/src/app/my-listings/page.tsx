import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { MyListingsClient } from "@/app/profile/listings/_components/MyListingsClient";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/i18n/server";

export default function MyListingsPage() {
  const locale = getRequestLocale();
  const dictionary = getDictionary(locale);

  return (
    <>
      <AppHeader />
      <PageContainer>
        <SectionHeader title={String(dictionary.myListings.title)} eyebrow={String(dictionary.myListings.eyebrow)} />
        <MyListingsClient />
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
