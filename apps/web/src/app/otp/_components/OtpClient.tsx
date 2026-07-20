"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OtpInput } from "@/components/auth/OtpInput";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { authErrorMessage, mapAuthError, safeNextPath } from "@/lib/auth/auth-ui";
import {
  clearOtpPhoneTransaction,
  createOtpPhoneTransaction,
  readOtpPhoneTransaction,
  saveOtpPhoneTransaction,
  type OtpPhoneTransaction
} from "@/lib/auth/otp-transaction";
import { maskE164Phone } from "@/lib/auth/phone";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { interpolate } from "@/i18n/get-dictionary";

const RESEND_COOLDOWN_SECONDS = 60;
const RESEND_COOLDOWN_MS = RESEND_COOLDOWN_SECONDS * 1000;

export function OtpClient() {
  const { locale, dictionary } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"), localizePath("/profile", locale));
  const [transaction, setTransaction] = useState<OtpPhoneTransaction | null>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  const resendRemainingSeconds = resendAvailableAt > now ? Math.ceil((resendAvailableAt - now) / 1000) : 0;
  const maskedPhone = transaction ? maskE164Phone(transaction.phone) : String(dictionary.auth.phoneMissing);

  useEffect(() => {
    const storedTransaction = readOtpPhoneTransaction();

    if (!storedTransaction) {
      setError(authErrorMessage("missing_session", locale));
      return;
    }

    setTransaction(storedTransaction);
    setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
  }, [locale]);

  useEffect(() => {
    if (!resendAvailableAt) return undefined;

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendAvailableAt]);

  async function verify() {
    setError(null);
    if (!transaction) {
      setError(authErrorMessage("missing_session", locale));
      return;
    }

    if (!hasSupabaseEnv()) {
      setError(String(dictionary.errors.missingSupabaseEnv));
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error: otpError } = await supabase.auth.verifyOtp({ phone: transaction.phone, token, type: "sms" });
    setLoading(false);

    if (otpError) {
      setError(authErrorMessage(mapAuthError(otpError, "invalid_or_expired_otp"), locale));
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase.from("profiles").upsert(
        {
          id: userData.user.id,
          phone: transaction.phone,
          language: locale,
          country: transaction.country,
          timezone: getBrowserTimeZone()
        },
        { onConflict: "id" }
      );
    }

    clearOtpPhoneTransaction();
    router.replace(next);
  }

  async function resend() {
    setError(null);
    if (!transaction) {
      setError(authErrorMessage("missing_session", locale));
      return;
    }

    if (resendRemainingSeconds > 0) {
      return;
    }

    if (!hasSupabaseEnv()) {
      setError(String(dictionary.errors.missingSupabaseEnv));
      return;
    }

    setResending(true);
    const supabase = getSupabaseBrowserClient();
    const { error: resendError } = await supabase.auth.signInWithOtp({
      phone: transaction.phone,
      options: {
        shouldCreateUser: true
      }
    });
    setResending(false);

    if (resendError) {
      setError(authErrorMessage(mapAuthError(resendError, "otp_send_failed"), locale));
      return;
    }

    const refreshedTransaction = createOtpPhoneTransaction(transaction.phone, transaction.country);
    saveOtpPhoneTransaction(refreshedTransaction);
    setTransaction(refreshedTransaction);
    setResendAvailableAt(Date.now() + RESEND_COOLDOWN_MS);
  }

  return (
    <div className="mx-auto max-w-md rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <p className="text-xs font-black uppercase tracking-wide text-oto-blue">OTOYALI</p>
      <h1 className="mt-2 text-2xl font-black text-oto-text">{String(dictionary.auth.verifyTitle)}</h1>
      <p className="mt-2 text-sm leading-6 text-oto-muted">{interpolate(String(dictionary.auth.verifyBody), { phone: maskedPhone })}</p>
      <div className="mt-5 grid gap-4">
        <OtpInput value={token} onChange={setToken} />
        {error ? <ErrorState message={error} /> : null}
        <Button onClick={verify} disabled={loading || token.length !== 6 || !transaction}>
          {loading ? String(dictionary.auth.verifying) : String(dictionary.auth.verifyCode)}
        </Button>
        <Button onClick={resend} variant="secondary" disabled={resending || !transaction || resendRemainingSeconds > 0}>
          {resending
            ? String(dictionary.auth.sending)
            : resendRemainingSeconds > 0
              ? interpolate(String(dictionary.auth.resendCooldown), { seconds: resendRemainingSeconds })
              : String(dictionary.auth.resendCode)}
        </Button>
      </div>
    </div>
  );
}

function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Istanbul";
  } catch {
    return "Europe/Istanbul";
  }
}
