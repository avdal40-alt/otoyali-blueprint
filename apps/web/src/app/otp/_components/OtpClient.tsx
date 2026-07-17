"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OtpInput } from "@/components/auth/OtpInput";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { friendlyAuthError, safeNextPath } from "@/lib/auth/auth-ui";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { interpolate } from "@/i18n/get-dictionary";

export function OtpClient() {
  const { locale, dictionary } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";
  const next = safeNextPath(searchParams.get("next"), localizePath("/profile", locale));
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function verify() {
    setError(null);
    if (!hasSupabaseEnv()) {
      setError(String(dictionary.errors.missingSupabaseEnv));
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error: otpError } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
    setLoading(false);

    if (otpError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Supabase OTP verify error:", otpError.message);
      }
      setError(friendlyAuthError(otpError.message, locale));
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase.from("profiles").upsert(
        {
          id: userData.user.id,
          phone,
          language: locale,
          country: "TR",
          timezone: "Europe/Istanbul"
        },
        { onConflict: "id" }
      );
    }

    router.replace(next);
  }

  async function resend() {
    setError(null);
    if (!hasSupabaseEnv()) {
      setError(String(dictionary.errors.missingSupabaseEnv));
      return;
    }

    setResending(true);
    const supabase = getSupabaseBrowserClient();
    const { error: resendError } = await supabase.auth.signInWithOtp({ phone });
    setResending(false);

    if (resendError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Supabase phone OTP resend error:", resendError.message);
      }
      setError(friendlyAuthError(resendError.message, locale));
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <p className="text-xs font-black uppercase tracking-wide text-oto-blue">OTOYALI</p>
      <h1 className="mt-2 text-2xl font-black text-oto-text">{String(dictionary.auth.verifyTitle)}</h1>
      <p className="mt-2 text-sm leading-6 text-oto-muted">{interpolate(String(dictionary.auth.verifyBody), { phone })}</p>
      <div className="mt-5 grid gap-4">
        <OtpInput value={token} onChange={setToken} />
        {error ? <ErrorState message={error} /> : null}
        <Button onClick={verify} disabled={loading || token.length !== 6 || !phone}>
          {loading ? String(dictionary.auth.verifying) : String(dictionary.auth.verifyCode)}
        </Button>
        <Button onClick={resend} variant="secondary" disabled={resending || !phone}>
          {resending ? String(dictionary.auth.sending) : String(dictionary.auth.resendCode)}
        </Button>
      </div>
    </div>
  );
}
