import { Suspense } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { LoadingState } from "@/components/ui/States";
import { AuthCallbackClient } from "./_components/AuthCallbackClient";

export default function AuthCallbackPage() {
  return (
    <>
      <AppHeader />
      <PageContainer>
        <Suspense fallback={<LoadingState />}>
          <AuthCallbackClient />
        </Suspense>
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}
