"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneInput } from "@/components/auth/PhoneInput";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { normalizePhoneTR } from "@/lib/format";
import { friendlyAuthError, safeNextPath } from "@/lib/auth/auth-ui";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

export function LoginClient() {
  const { locale, dictionary } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"), localizePath("/profile", locale));
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const normalizedPhone = normalizePhoneTR(phone);
  const isValidPhone = /^\+90[5]\d{9}$/.test(normalizedPhone);

  async function submit() {
    setError(null);

    if (!isValidPhone) {
      setError(String(dictionary.validation.phoneInvalid));
      return;
    }

    if (!hasSupabaseEnv()) {
      setError(String(dictionary.errors.missingSupabaseEnv));
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
      options: {
        shouldCreateUser: true
      }
    });
    setLoading(false);

    if (otpError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("Supabase phone OTP error:", otpError.message);
      }
      setError(friendlyAuthError(otpError.message, locale));
      return;
    }

    router.push(localizePath(`/otp?phone=${encodeURIComponent(normalizedPhone)}&next=${encodeURIComponent(next)}`, locale));
  }

  return (
    <div className="mx-auto max-w-md rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <p className="text-xs font-black uppercase tracking-wide text-oto-blue">OTOYALI</p>
      <h1 className="mt-2 text-2xl font-black text-oto-text">{String(dictionary.auth.loginTitle)}</h1>
      <p className="mt-2 text-sm leading-6 text-oto-muted">{String(dictionary.auth.loginBody)}</p>
      <p className="mt-3 rounded-md bg-oto-surface p-3 text-xs font-semibold leading-5 text-oto-muted">
        {String(dictionary.auth.phoneHint)}
      </p>
      <div className="mt-5 grid gap-4">
        <PhoneInput value={phone} onChange={setPhone} />
        {error ? <ErrorState message={error} /> : null}
        <Button onClick={submit} disabled={loading || !isValidPhone}>
          {loading ? String(dictionary.auth.sending) : String(dictionary.auth.sendCode)}
        </Button>
      </div>
    </div>
  );
}
