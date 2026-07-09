"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneInput } from "@/components/auth/PhoneInput";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { normalizePhoneTR } from "@/lib/format";
import { friendlyAuthError, safeNextPath } from "@/lib/auth/auth-ui";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"), "/profile");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const normalizedPhone = normalizePhoneTR(phone);
  const isValidPhone = /^\+90[5]\d{9}$/.test(normalizedPhone);

  async function submit() {
    setError(null);

    if (!isValidPhone) {
      setError("Telefon numarasını kontrol edin.");
      return;
    }

    if (!hasSupabaseEnv()) {
      setError("Supabase ortam değişkenleri eksik.");
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
      setError(friendlyAuthError(otpError.message));
      return;
    }

    router.push(`/otp?phone=${encodeURIComponent(normalizedPhone)}&next=${encodeURIComponent(next)}`);
  }

  return (
    <div className="mx-auto max-w-md rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <p className="text-xs font-black uppercase tracking-wide text-oto-blue">OTOYALI</p>
      <h1 className="mt-2 text-2xl font-black text-oto-text">Telefon numaranızla giriş yapın</h1>
      <p className="mt-2 text-sm leading-6 text-oto-muted">Size tek kullanımlık doğrulama kodu göndereceğiz.</p>
      <p className="mt-3 rounded-md bg-oto-surface p-3 text-xs font-semibold leading-5 text-oto-muted">
        Türkiye cep telefonu formatı kullanın: +90 5xx xxx xx xx.
      </p>
      <div className="mt-5 grid gap-4">
        <PhoneInput value={phone} onChange={setPhone} />
        {error ? <ErrorState message={error} /> : null}
        <Button onClick={submit} disabled={loading || !isValidPhone}>
          {loading ? "Gönderiliyor" : "Kod gönder"}
        </Button>
      </div>
    </div>
  );
}
