"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { friendlyAuthError, safeNextPath } from "@/lib/auth/auth-ui";

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function completeCallback() {
      if (!hasSupabaseEnv()) {
        setError("Supabase ortam değişkenleri eksik.");
        return;
      }

      const next = safeNextPath(searchParams.get("next"), "/profile");
      const code = searchParams.get("code");
      const errorDescription = searchParams.get("error_description") || searchParams.get("error");

      if (errorDescription) {
        setError(friendlyAuthError(errorDescription));
        return;
      }

      if (!code) {
        router.replace(next);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { error: callbackError } = await supabase.auth.exchangeCodeForSession(code);
      if (callbackError) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("Supabase auth callback error:", callbackError.message);
        }
        setError(friendlyAuthError(callbackError.message));
        return;
      }

      router.replace(next);
    }

    void completeCallback();
  }, [router, searchParams]);

  if (error) return <ErrorState message={error} />;
  return <LoadingState label="Oturum hazırlanıyor" />;
}
