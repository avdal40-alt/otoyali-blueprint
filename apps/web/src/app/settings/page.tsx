import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { SettingsClient } from "./_components/SettingsClient";

export default function SettingsPage() {
  return (
    <>
      <AppHeader />
      <PageContainer>
        <SectionHeader title="Ayarlar" eyebrow="Hesabim" />
        <SettingsClient />
      </PageContainer>
    </>
  );
}
