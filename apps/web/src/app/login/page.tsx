import { Suspense } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { LoadingState } from "@/components/ui/States";
import { LoginClient } from "./_components/LoginClient";

export default function LoginPage() {
  return (
    <>
      <AppHeader />
      <PageContainer>
        <Suspense fallback={<LoadingState />}>
          <LoginClient />
        </Suspense>
      </PageContainer>
    </>
  );
}
