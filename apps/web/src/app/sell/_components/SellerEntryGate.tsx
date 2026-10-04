"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { OtpInput } from "@/components/auth/OtpInput";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type GateState = "checking" | "phone" | "sending" | "otp" | "verifying" | "rateLimited" | "providerUnavailable" | "error" | "eligible";
type ApiFailure = "auth_required" | "invalid_phone" | "rate_limited" | "verification_unavailable" | "challenge_unavailable" | "invalid_code" | "phone_already_verified" | "invalid_input" | "eligibility_unavailable";

function messageFor(code: ApiFailure | null, dictionary: ReturnType<typeof useI18n>["dictionary"]) {
  if (code === "invalid_phone") return String(dictionary.sell.sellerPhoneInvalid);
  if (code === "rate_limited") return String(dictionary.sell.sellerPhoneRateLimited);
  if (code === "challenge_unavailable") return String(dictionary.sell.sellerPhoneExpired);
  if (code === "invalid_code") return String(dictionary.sell.sellerPhoneInvalidCode);
  if (code === "verification_unavailable" || code === "eligibility_unavailable") return String(dictionary.sell.sellerPhoneUnavailable);
  if (code === "phone_already_verified") return String(dictionary.sell.sellerPhoneAlreadyUsed);
  return String(dictionary.sell.sellerPhoneGenericError);
}

export function SellerEntryGate({ children }: { children: ReactNode }) {
  const { locale, dictionary } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<GateState>("checking");
  const [nationalPhone, setNationalPhone] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [errorCode, setErrorCode] = useState<ApiFailure | null>(null);
  const otpInputId = "seller-phone-otp-code";
  const returnPath = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;

  const redirectToLogin = useCallback(() => {
    router.replace(localizePath(`/login?next=${encodeURIComponent(returnPath)}`, locale));
  }, [locale, returnPath, router]);

  const getAccessToken = useCallback(async () => {
    if (!hasSupabaseEnv()) return null;
    const { data } = await getSupabaseBrowserClient().auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const checkEligibility = useCallback(async () => {
    setState("checking");
    setErrorCode(null);
    const accessToken = await getAccessToken();
    if (!accessToken) {
      redirectToLogin();
      return false;
    }

    let response: Response;
    try {
      response = await fetch("/api/seller/eligibility", { headers: { Authorization: `Bearer ${accessToken}` } });
    } catch {
      setErrorCode("eligibility_unavailable");
      setState("error");
      return false;
    }
    if (response.status === 401) {
      redirectToLogin();
      return false;
    }
    const body = await response.json().catch(() => null) as { data?: { eligible?: unknown }; error?: { code?: unknown } } | null;
    if (!response.ok || typeof body?.data?.eligible !== "boolean") {
      setErrorCode(typeof body?.error?.code === "string" ? body.error.code as ApiFailure : "eligibility_unavailable");
      setState("error");
      return false;
    }
    setState(body.data.eligible ? "eligible" : "phone");
    return body.data.eligible;
  }, [getAccessToken, redirectToLogin]);

  useEffect(() => { void checkEligibility(); }, [checkEligibility]);

  async function startVerification() {
    const phone = nationalPhone.replace(/\D/g, "");
    if (phone.length !== 10 || phone.startsWith("0")) {
      setErrorCode("invalid_phone");
      setState("phone");
      return;
    }
    const accessToken = await getAccessToken();
    if (!accessToken) return redirectToLogin();
    setState("sending");
    setErrorCode(null);
    let response: Response;
    try {
      response = await fetch("/api/seller/phone-verification/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ phone: `+90${phone}` })
      });
    } catch {
      setErrorCode("verification_unavailable");
      setState("providerUnavailable");
      return;
    }
    if (response.status === 401) return redirectToLogin();
    const body = await response.json().catch(() => null) as { data?: { challengeId?: unknown; maskedPhone?: unknown }; error?: { code?: unknown } } | null;
    if (!response.ok || typeof body?.data?.challengeId !== "string") {
      const failure = typeof body?.error?.code === "string" ? body.error.code as ApiFailure : "verification_unavailable";
      setErrorCode(failure);
      setState(failure === "rate_limited" ? "rateLimited" : failure === "verification_unavailable" ? "providerUnavailable" : "phone");
      return;
    }
    setChallengeId(body.data.challengeId);
    setMaskedPhone(typeof body.data.maskedPhone === "string" ? body.data.maskedPhone : null);
    setCode("");
    setState("otp");
    requestAnimationFrame(() => document.getElementById(otpInputId)?.focus());
  }

  async function verifyCode() {
    if (!challengeId) {
      setErrorCode("challenge_unavailable");
      setState("phone");
      return;
    }
    const accessToken = await getAccessToken();
    if (!accessToken) return redirectToLogin();
    setState("verifying");
    setErrorCode(null);
    let response: Response;
    try {
      response = await fetch("/api/seller/phone-verification/verify", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, code })
      });
    } catch {
      setErrorCode("verification_unavailable");
      setState("providerUnavailable");
      return;
    }
    if (response.status === 401) return redirectToLogin();
    const body = await response.json().catch(() => null) as { error?: { code?: unknown } } | null;
    if (!response.ok) {
      const failure = typeof body?.error?.code === "string" ? body.error.code as ApiFailure : "verification_unavailable";
      setErrorCode(failure);
      setState(failure === "challenge_unavailable" ? "phone" : failure === "verification_unavailable" ? "providerUnavailable" : "otp");
      return;
    }
    await checkEligibility();
  }

  if (state === "eligible") return <>{children}</>;
  if (state === "checking") return <LoadingState label={String(dictionary.sell.sellerPhoneChecking)} />;

  const error = errorCode ? messageFor(errorCode, dictionary) : null;
  const isOtp = state === "otp" || state === "verifying";
  const busy = state === "sending" || state === "verifying";
  return (
    <section className="mx-auto max-w-md rounded-oto border border-oto-border bg-white p-5 shadow-soft md:p-6" aria-labelledby="seller-phone-verification-title">
      <p className="text-xs font-black uppercase tracking-wide text-oto-blue">Yolmod</p>
      <h2 id="seller-phone-verification-title" className="mt-2 text-2xl font-black text-oto-text">{String(dictionary.sell.sellerPhoneTitle)}</h2>
      <p className="mt-2 text-sm leading-6 text-oto-muted">{String(dictionary.sell.sellerPhoneBody)}</p>
      <p className="mt-3 rounded-md bg-oto-surface p-3 text-xs font-semibold leading-5 text-oto-muted">{String(dictionary.sell.sellerPhoneAuthIndependent)}</p>
      {isOtp ? (
        <form className="mt-5 grid gap-4" onSubmit={(event) => { event.preventDefault(); void verifyCode(); }}>
          <p className="text-sm leading-6 text-oto-muted">{String(dictionary.sell.sellerPhoneCodeSent)}{maskedPhone ? ` ${maskedPhone}` : ""}</p>
          <OtpInput id={otpInputId} value={code} onChange={setCode} label={String(dictionary.sell.sellerPhoneOtpLabel)} />
          {error ? <ErrorState message={error} /> : null}
          <div aria-live="polite" className="sr-only">{busy ? String(dictionary.sell.sellerPhoneVerifying) : ""}</div>
          <Button type="submit" disabled={busy || code.length !== 6} isLoading={state === "verifying"}>{String(dictionary.sell.sellerPhoneVerify)}</Button>
          <Button type="button" variant="secondary" disabled={busy} onClick={() => { setChallengeId(null); setCode(""); setErrorCode(null); setState("phone"); }}>{String(dictionary.sell.sellerPhoneBack)}</Button>
        </form>
      ) : (
        <form className="mt-5 grid gap-4" onSubmit={(event) => { event.preventDefault(); void startVerification(); }}>
          <div>
            <label className="mb-2 block text-sm font-bold text-oto-text" htmlFor="seller-turkey-phone">{String(dictionary.sell.sellerPhoneLabel)}</label>
            <div className="flex min-w-0 gap-2" dir="ltr">
              <span className="flex h-11 shrink-0 items-center rounded-md border border-oto-border bg-oto-surface px-3 text-sm font-bold text-oto-text">+90</span>
              <Input id="seller-turkey-phone" value={nationalPhone} onChange={(event) => setNationalPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" autoComplete="tel-national" placeholder="555 123 45 67" aria-invalid={Boolean(error) || undefined} aria-describedby={error ? "seller-phone-error" : undefined} disabled={busy} />
            </div>
          </div>
          {error ? <p id="seller-phone-error" role="alert" className="text-error text-oto-danger">{error}</p> : null}
          <div aria-live="polite" className="sr-only">{busy ? String(dictionary.sell.sellerPhoneSending) : ""}</div>
          <Button type="submit" disabled={busy || nationalPhone.length !== 10} isLoading={state === "sending"}>{String(dictionary.sell.sellerPhoneSend)}</Button>
          {state === "rateLimited" || state === "providerUnavailable" || state === "error" ? <Button type="button" variant="secondary" disabled={busy} onClick={() => void checkEligibility()}>{String(dictionary.sell.sellerPhoneRetry)}</Button> : null}
        </form>
      )}
    </section>
  );
}
