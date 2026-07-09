"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OtpInput } from "@/components/auth/OtpInput";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { friendlyAuthError, safeNextPath } from "@/lib/auth/auth-ui";

export function OtpClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";
  const next = safeNextPath(searchParams.get("next"), "/profile");
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  async function verify() {
    setError(null);
    if (!hasSupabaseEnv()) {
      setError("Supabase ortam değişkenleri eksik.");
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
      setError(friendlyAuthError(otpError.message));
      return;
    }

    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      await supabase.from("profiles").upsert(
        {
          id: userData.user.id,
          phone,
          language: "tr",
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
      setError("Supabase ortam değişkenleri eksik.");
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
      setError(friendlyAuthError(resendError.message));
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <p className="text-xs font-black uppercase tracking-wide text-oto-blue">OTOYALI</p>
      <h1 className="mt-2 text-2xl font-black text-oto-text">Doğrulama kodu</h1>
      <p className="mt-2 text-sm leading-6 text-oto-muted">{phone} numarasına gelen 6 haneli kodu yazın.</p>
      <div className="mt-5 grid gap-4">
        <OtpInput value={token} onChange={setToken} />
        {error ? <ErrorState message={error} /> : null}
        <Button onClick={verify} disabled={loading || token.length !== 6 || !phone}>
          {loading ? "Doğrulanıyor" : "Giriş yap"}
        </Button>
        <Button onClick={resend} variant="secondary" disabled={resending || !phone}>
          {resending ? "Gönderiliyor" : "Kodu tekrar gönder"}
        </Button>
      </div>
    </div>
  );
}
