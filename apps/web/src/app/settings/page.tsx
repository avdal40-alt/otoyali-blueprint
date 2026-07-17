import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { getDictionary } from "@/i18n/get-dictionary";
import { getRequestLocale } from "@/i18n/server";
import { SettingsClient } from "./_components/SettingsClient";

export default async function SettingsPage() {
  const locale = await getRequestLocale();
  const dictionary = getDictionary(locale);

  return (
    <>
      <AppHeader />
      <PageContainer>
        <SectionHeader title={String(dictionary.navigation.settings)} eyebrow={String(dictionary.profile.account)} />
        <SettingsClient />
      </PageContainer>
    </>
  );
}
