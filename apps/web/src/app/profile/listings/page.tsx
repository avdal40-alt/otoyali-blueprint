import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { getRequestLocale } from "@/i18n/server";
import { getMyListingsCopy } from "./my-listings-copy";
import { MyListingsClient } from "./_components/MyListingsClient";

export default async function MyListingsPage() {
  const locale = await getRequestLocale();
  const copy = getMyListingsCopy(locale);

  return (
    <>
      <AppHeader />
      <PageContainer>
        <SectionHeader title={copy.title} eyebrow={copy.eyebrow} />
        <MyListingsClient locale={locale} />
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
