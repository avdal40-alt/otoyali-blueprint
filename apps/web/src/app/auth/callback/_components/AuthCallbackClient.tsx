"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { authErrorMessage, mapAuthError, safeNextPath } from "@/lib/auth/auth-ui";
import { useI18n } from "@/i18n/client";
import { localizePath } from "@/i18n/config";
import { getAuthCopy } from "@/lib/auth/auth-copy";

export function AuthCallbackClient() {
  const { locale } = useI18n();
  const copy = getAuthCopy(locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function completeCallback() {
      if (!hasSupabaseEnv()) {
        setError(copy.authConfiguration);
        return;
      }

      const next = localizePath(safeNextPath(searchParams.get("next"), "/profile"), locale);
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
  }, [copy.authConfiguration, locale, router, searchParams]);

  if (error) return <ErrorState message={error} />;
  return <LoadingState label={copy.verifying} />;
}
