"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneInput } from "@/components/auth/PhoneInput";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { normalizePhoneTR } from "@/lib/format";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);

    if (!hasSupabaseEnv()) {
      setError("Supabase ortam degiskenleri eksik. .env.local dosyasini kontrol edin.");
      return;
    }

    const normalized = normalizePhoneTR(phone);
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: normalized });
    setLoading(false);

    if (otpError) {
      setError(otpError.message);
      return;
    }

    router.push(`/otp?phone=${encodeURIComponent(normalized)}&next=${encodeURIComponent(next)}`);
  }

  return (
    <div className="mx-auto max-w-md rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <h1 className="text-2xl font-black text-oto-text">Telefon ile giris</h1>
      <p className="mt-2 text-sm leading-6 text-oto-muted">E-posta veya sifre yok. OTOYALI sadece telefon OTP ile giris yapar.</p>
      <div className="mt-5 grid gap-4">
        <PhoneInput value={phone} onChange={setPhone} />
        {error ? <ErrorState message={error} /> : null}
        <Button onClick={submit} disabled={loading || !phone.trim()}>
          {loading ? "Gonderiliyor" : "Kod gonder"}
        </Button>
      </div>
    </div>
  );
}
