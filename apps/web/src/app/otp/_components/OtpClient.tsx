"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { OtpInput } from "@/components/auth/OtpInput";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

export function OtpClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get("phone") || "";
  const next = searchParams.get("next") || "/profile";
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
      setError(otpError.message);
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

    router.replace(next.startsWith("/") ? next : "/profile");
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
      setError(`${resendError.message}. SMS gönderimi şu anda kullanılamıyor olabilir. Lütfen daha sonra tekrar deneyin.`);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <h1 className="text-2xl font-black text-oto-text">Kodu girin</h1>
      <p className="mt-2 text-sm leading-6 text-oto-muted">{phone} numarasına gelen 6 haneli kodu yazın.</p>
      <div className="mt-5 grid gap-4">
        <OtpInput value={token} onChange={setToken} />
        {error ? <ErrorState message={error} /> : null}
        <Button onClick={verify} disabled={loading || token.length !== 6}>
          {loading ? "Doğrulanıyor" : "Doğrula"}
        </Button>
        <Button onClick={resend} variant="secondary" disabled={resending || !phone}>
          {resending ? "Gönderiliyor" : "Kodu tekrar gönder"}
        </Button>
      </div>
    </div>
  );
}
