import { AppHeader } from "@/components/layout/AppHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { ProfileClient } from "./_components/ProfileClient";

export default function ProfilePage() {
  return (
    <>
      <AppHeader />
      <PageContainer>
        <ProfileClient />
      </PageContainer>
      <MobileBottomNav />
    </>
  );
}
