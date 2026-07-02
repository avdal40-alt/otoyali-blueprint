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
  const next = searchParams.get("next") || "/";
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function verify() {
    setError(null);
    if (!hasSupabaseEnv()) {
      setError("Supabase ortam degiskenleri eksik.");
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

    router.replace(next.startsWith("/") ? next : "/");
  }

  return (
    <div className="mx-auto max-w-md rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <h1 className="text-2xl font-black text-oto-text">Kodu girin</h1>
      <p className="mt-2 text-sm leading-6 text-oto-muted">{phone} numarasina gelen 6 haneli kodu yazin.</p>
      <div className="mt-5 grid gap-4">
        <OtpInput value={token} onChange={setToken} />
        {error ? <ErrorState message={error} /> : null}
        <Button onClick={verify} disabled={loading || token.length !== 6}>
          {loading ? "Dogrulaniyor" : "Dogrula"}
        </Button>
      </div>
    </div>
  );
}
