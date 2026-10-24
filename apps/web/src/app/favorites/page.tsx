import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { FavoritesClient } from "./_components/FavoritesClient";
import { getRequestLocale } from "@/i18n/server";
import { getFavoritesCopy } from "./_components/favorites-copy";

export default async function FavoritesPage() {
  const locale = await getRequestLocale();
  const copy = getFavoritesCopy(locale);

  return (
    <>
      <AppHeader />
      <PageContainer>
        <SectionHeader title={copy.title} eyebrow={copy.eyebrow} />
        <FavoritesClient />
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
