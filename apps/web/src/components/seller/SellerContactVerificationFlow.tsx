"use client";

import { useState } from "react";
import { OtpInput } from "@/components/auth/OtpInput";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ErrorState } from "@/components/ui/States";
import { useI18n } from "@/i18n/client";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { parseSellerContactPhone, sellerContactPhonePlaceholder } from "@/lib/seller-phone-verification/client-policy";

type VerificationState = "phone" | "sending" | "otp" | "verifying" | "rateLimited" | "providerUnavailable";
type ApiFailure = "auth_required" | "invalid_phone" | "rate_limited" | "verification_unavailable" | "challenge_unavailable" | "invalid_code" | "phone_already_verified" | "invalid_input";

type SellerContactVerificationFlowProps = {
  onVerified: () => void | Promise<void>;
  onCancel?: () => void;
  onAuthRequired?: () => void;
};

function messageFor(code: ApiFailure | null, dictionary: ReturnType<typeof useI18n>["dictionary"]) {
  if (code === "invalid_phone") return String(dictionary.sell.sellerPhoneInvalid);
  if (code === "rate_limited") return String(dictionary.sell.sellerPhoneRateLimited);
  if (code === "challenge_unavailable") return String(dictionary.sell.sellerPhoneExpired);
  if (code === "invalid_code") return String(dictionary.sell.sellerPhoneInvalidCode);
  if (code === "verification_unavailable") return String(dictionary.sell.sellerPhoneUnavailable);
  if (code === "phone_already_verified") return String(dictionary.sell.sellerPhoneAlreadyUsed);
  return String(dictionary.sell.sellerPhoneGenericError);
}

export function SellerContactVerificationFlow({
  onVerified,
  onCancel,
  onAuthRequired
}: SellerContactVerificationFlowProps) {
  const { dictionary } = useI18n();
  const [state, setState] = useState<VerificationState>("phone");
  const [phone, setPhone] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [errorCode, setErrorCode] = useState<ApiFailure | null>(null);
  const otpInputId = "seller-contact-verification-otp-code";

  async function getAccessToken() {
    if (!hasSupabaseEnv()) return null;
    const { data } = await getSupabaseBrowserClient().auth.getSession();
    return data.session?.access_token ?? null;
  }

  function handleAuthRequired() {
    setErrorCode("auth_required");
    setState("phone");
    onAuthRequired?.();
  }

  async function startVerification() {
    const parsedPhone = parseSellerContactPhone(phone);
    if (!parsedPhone) {
      setErrorCode("invalid_phone");
      setState("phone");
      return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
      handleAuthRequired();
      return;
    }

    setState("sending");
    setErrorCode(null);
    let response: Response;
    try {
      response = await fetch("/api/seller/phone-verification/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ phone: parsedPhone })
      });
    } catch {
      setErrorCode("verification_unavailable");
      setState("providerUnavailable");
      return;
    }

    if (response.status === 401) {
      handleAuthRequired();
      return;
    }

    const body = await response.json().catch(() => null) as {
      data?: { challengeId?: unknown; maskedPhone?: unknown };
      error?: { code?: unknown };
    } | null;
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
    if (!accessToken) {
      handleAuthRequired();
      return;
    }

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

    if (response.status === 401) {
      handleAuthRequired();
      return;
    }

    const body = await response.json().catch(() => null) as { error?: { code?: unknown } } | null;
    if (!response.ok) {
      const failure = typeof body?.error?.code === "string" ? body.error.code as ApiFailure : "verification_unavailable";
      setErrorCode(failure);
      setState(failure === "challenge_unavailable" ? "phone" : failure === "verification_unavailable" ? "providerUnavailable" : "otp");
      return;
    }

    await onVerified();
  }

  const error = errorCode ? messageFor(errorCode, dictionary) : null;
  const isOtp = state === "otp" || state === "verifying";
  const busy = state === "sending" || state === "verifying";

  return isOtp ? (
    <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void verifyCode(); }}>
      <p className="text-sm leading-6 text-oto-muted">{String(dictionary.sell.sellerPhoneCodeSent)}{maskedPhone ? ` ${maskedPhone}` : ""}</p>
      <OtpInput id={otpInputId} value={code} onChange={setCode} label={String(dictionary.sell.sellerPhoneOtpLabel)} />
      {error ? <ErrorState message={error} /> : null}
      <div aria-live="polite" className="sr-only">{busy ? String(dictionary.sell.sellerPhoneVerifying) : ""}</div>
      <Button type="submit" disabled={busy || code.length !== 6} isLoading={state === "verifying"}>{String(dictionary.sell.sellerPhoneVerify)}</Button>
      <Button type="button" variant="secondary" disabled={busy} onClick={() => { setChallengeId(null); setCode(""); setErrorCode(null); setState("phone"); }}>{String(dictionary.sell.sellerPhoneBack)}</Button>
    </form>
  ) : (
    <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void startVerification(); }}>
      <div>
        <label className="mb-2 block text-sm font-bold text-oto-text" htmlFor="seller-contact-phone">{String(dictionary.sell.sellerPhoneLabel)}</label>
        <Input id="seller-contact-phone" value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder={sellerContactPhonePlaceholder()} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? "seller-contact-phone-error" : undefined} disabled={busy} />
      </div>
      {error ? <p id="seller-contact-phone-error" role="alert" className="text-error text-oto-danger">{error}</p> : null}
      <div aria-live="polite" className="sr-only">{busy ? String(dictionary.sell.sellerPhoneSending) : ""}</div>
      <Button type="submit" disabled={busy || !phone.trim()} isLoading={state === "sending"}>{String(dictionary.sell.sellerPhoneSend)}</Button>
      {state === "rateLimited" || state === "providerUnavailable" ? <Button type="button" variant="secondary" disabled={busy} onClick={() => { setErrorCode(null); setState("phone"); }}>{String(dictionary.sell.sellerPhoneRetry)}</Button> : null}
      {onCancel ? <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>{String(dictionary.sell.sellerPhoneBack)}</Button> : null}
    </form>
  );
}
