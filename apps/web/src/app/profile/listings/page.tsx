import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/i18n/server";
import { MyListingsClient } from "./_components/MyListingsClient";

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
    </>
  );
}
