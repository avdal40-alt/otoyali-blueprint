import { Suspense } from "react";
import { LoadingState } from "@/components/ui/States";
import { AdminLoginClient } from "./_components/AdminLoginClient";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <AdminLoginClient />
    </Suspense>
  );
}
