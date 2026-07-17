import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { FavoritesClient } from "./_components/FavoritesClient";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/i18n/server";

export default function FavoritesPage() {
  const locale = getRequestLocale();
  const dictionary = getDictionary(locale);

  return (
    <>
      <AppHeader />
      <PageContainer>
        <SectionHeader title={String(dictionary.favorites.title)} eyebrow={String(dictionary.favorites.eyebrow)} />
        <FavoritesClient />
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
