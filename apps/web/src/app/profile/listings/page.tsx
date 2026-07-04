import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer, SectionHeader } from "@/components/layout/PageContainer";
import { MyListingsClient } from "./_components/MyListingsClient";

export default function MyListingsPage() {
  return (
    <>
      <AppHeader />
      <PageContainer>
        <SectionHeader title="İlanlarım" eyebrow="Hesabım" />
        <MyListingsClient />
      </PageContainer>
    </>
  );
}
