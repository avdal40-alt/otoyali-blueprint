import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { getRequestLocale } from "@/i18n/server";
import { SettingsClient } from "./_components/SettingsClient";
import { getSettingsCopy } from "./_components/settings-copy";

export default async function SettingsPage() {
  const locale = await getRequestLocale();
  const copy = getSettingsCopy(locale);

  return (
    <>
      <AppHeader />
      <PageContainer>
        <SectionHeader title={copy.title} eyebrow={copy.account} />
        <SettingsClient />
      </PageContainer>
    </>
  );
}
