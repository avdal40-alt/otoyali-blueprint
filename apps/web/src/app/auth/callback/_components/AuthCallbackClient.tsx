"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { authErrorMessage, mapAuthError, safeNextPath } from "@/lib/auth/auth-ui";
import { useI18n } from "@/i18n/client";

export function AuthCallbackClient() {
  const { locale, dictionary } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function completeCallback() {
      if (!hasSupabaseEnv()) {
        setError(String(dictionary.errors.authConfiguration));
        return;
      }

      const next = safeNextPath(searchParams.get("next"), "/profile");
      const code = searchParams.get("code");
      const errorDescription = searchParams.get("error_description") || searchParams.get("error");

      if (errorDescription) {
        setError(authErrorMessage(mapAuthError(errorDescription), locale));
        return;
      }

      if (!code) {
        router.replace(next);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { error: callbackError } = await supabase.auth.exchangeCodeForSession(code);
      if (callbackError) {
        setError(authErrorMessage(mapAuthError(callbackError), locale));
        return;
      }

      router.replace(next);
    }

    void completeCallback();
  }, [dictionary.errors.authConfiguration, locale, router, searchParams]);

  if (error) return <ErrorState message={error} />;
  return <LoadingState label={String(dictionary.auth.callbackLoading)} />;
}
