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
  const normalizedPhone = normalizePhoneTR(phone);
  const isValidPhone = /^\+90\d{10}$/.test(normalizedPhone);

  async function submit() {
    setError(null);

    if (!isValidPhone) {
      setError("Gecerli bir Turkiye telefon numarasi girin.");
      return;
    }

    if (!hasSupabaseEnv()) {
      setError("Supabase ortam degiskenleri eksik. .env.local dosyasini kontrol edin.");
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: normalizedPhone });
    setLoading(false);

    if (otpError) {
      setError(`${otpError.message}. SMS saglayicisi henuz yapilandirilmadiysa gelistirme asamasinda giris test edilemeyebilir.`);
      return;
    }

    router.push(`/otp?phone=${encodeURIComponent(normalizedPhone)}&next=${encodeURIComponent(next)}`);
  }

  return (
    <div className="mx-auto max-w-md rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <h1 className="text-2xl font-black text-oto-text">Telefon ile giris</h1>
      <p className="mt-2 text-sm leading-6 text-oto-muted">E-posta veya sifre yok. OTOYALI sadece telefon OTP ile giris yapar.</p>
      <p className="mt-2 rounded-md bg-oto-surface p-3 text-xs font-semibold leading-5 text-oto-muted">
        SMS saglayicisi henuz yapilandirilmadiysa gelistirme asamasinda giris test edilemeyebilir.
      </p>
      <div className="mt-5 grid gap-4">
        <PhoneInput value={phone} onChange={setPhone} />
        {error ? <ErrorState message={error} /> : null}
        <Button onClick={submit} disabled={loading || !isValidPhone}>
          {loading ? "Gonderiliyor" : "Kod gonder"}
        </Button>
      </div>
    </div>
  );
}
