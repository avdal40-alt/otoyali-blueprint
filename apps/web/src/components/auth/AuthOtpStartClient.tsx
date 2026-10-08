"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneInput } from "@/components/auth/PhoneInput";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { authErrorMessage, mapAuthError, safeNextPath } from "@/lib/auth/auth-ui";
import { buildPhoneSignupMetadata } from "@/lib/auth/signup-metadata";
import { createOtpPhoneTransaction, saveOtpPhoneTransaction, type OtpPhoneTransaction } from "@/lib/auth/otp-transaction";
import { DEFAULT_PHONE_COUNTRY, parseAuthPhoneNumber, type AuthPhoneCountry } from "@/lib/auth/phone";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

type Purpose = OtpPhoneTransaction["purpose"];
export function AuthOtpStartClient({ purpose }: { purpose: Purpose }) {
  const { locale, dictionary } = useI18n(); const router = useRouter(); const searchParams = useSearchParams();
  const [phone, setPhone] = useState(""); const [country, setCountry] = useState<AuthPhoneCountry>(DEFAULT_PHONE_COUNTRY);
  const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  const parsed = parseAuthPhoneNumber(phone, country); const next = localizePath(safeNextPath(searchParams.get("next"), "/profile"), locale);
  useEffect(() => { if (phone.trim().startsWith("+")) { const result = parseAuthPhoneNumber(phone, country); if (result.ok && result.country !== country) setCountry(result.country); } }, [phone, country]);
  const title = purpose === "registration" ? String(dictionary.auth.createAccountTitle) : purpose === "recovery" ? String(dictionary.auth.forgotPasswordTitle) : String(dictionary.auth.legacyTitle);
  const body = purpose === "registration" ? String(dictionary.auth.createAccountBody) : purpose === "recovery" ? String(dictionary.auth.forgotPasswordBody) : String(dictionary.auth.legacyBody);
  async function submit() {
    setError(null); if (!parsed.ok) { setError(authErrorMessage(parsed.error === "ambiguous_country" ? "ambiguous_phone_country" : "invalid_phone", locale)); return; }
    if (!hasSupabaseEnv()) { setError(String(dictionary.errors.authConfiguration)); return; }
    const metadata = buildPhoneSignupMetadata({ selectedCountry: country, locale }); if (!metadata) { setError(authErrorMessage("invalid_phone", locale)); return; }
    setLoading(true); const { error: otpError } = await getSupabaseBrowserClient().auth.signInWithOtp({ phone: parsed.e164, options: { shouldCreateUser: purpose === "registration", ...(purpose === "registration" ? { data: metadata } : {}) } }); setLoading(false);
    if (otpError) { setError(authErrorMessage(mapAuthError(otpError, "otp_send_failed"), locale)); return; }
    saveOtpPhoneTransaction(createOtpPhoneTransaction(parsed.e164, country, purpose)); router.push(localizePath(`/otp?next=${encodeURIComponent(next)}`, locale));
  }
  return <div className="mx-auto max-w-md rounded-oto border border-oto-border bg-white p-5 shadow-soft"><p className="text-xs font-black uppercase tracking-wide text-oto-blue">Yolmod</p><h1 className="mt-2 text-2xl font-black text-oto-text">{title}</h1><p className="mt-2 text-sm leading-6 text-oto-muted">{body}</p><div className="mt-5 grid gap-4"><PhoneInput value={phone} onChange={setPhone} selectedCountry={country} onCountryChange={setCountry} locale={locale} label={String(dictionary.auth.phoneLabel)} countryLabel={String(dictionary.auth.countryLabel)} searchLabel={String(dictionary.auth.countrySearchLabel)} searchPlaceholder={String(dictionary.auth.countrySearchPlaceholder)} placeholder={String(dictionary.auth.phonePlaceholder)} noResults={String(dictionary.auth.countryNoResults)} helperText={String(dictionary.auth.phoneInputHelper)} />{error ? <ErrorState message={error} /> : null}<Button onClick={submit} disabled={loading || !parsed.ok}>{loading ? String(dictionary.auth.sending) : String(dictionary.auth.sendCode)}</Button><Link className="text-center text-sm font-bold text-oto-blue" href={`${localizePath("/login", locale)}?next=${encodeURIComponent(next)}`}>{String(dictionary.auth.backToLogin)}</Link></div></div>;
}
