import { Suspense } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { LoadingState } from "@/components/ui/States";
import { OtpClient } from "./_components/OtpClient";

export default function OtpPage() {
  return (
    <>
      <AppHeader />
      <PageContainer>
        <Suspense fallback={<LoadingState />}>
          <OtpClient />
        </Suspense>
      </PageContainer>
    </>
  );
}
