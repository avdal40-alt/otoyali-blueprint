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
import { getAuthCopy } from "@/lib/auth/auth-copy";
import { getJolmodLegalDocument } from "@/i18n/jolmod-legal-documents";

type Purpose = OtpPhoneTransaction["purpose"];
export function AuthOtpStartClient({ purpose }: { purpose: Purpose }) {
  const { locale } = useI18n(); const copy = getAuthCopy(locale); const router = useRouter(); const searchParams = useSearchParams();
  const [phone, setPhone] = useState(""); const [country, setCountry] = useState<AuthPhoneCountry>(DEFAULT_PHONE_COUNTRY);
  const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false); const [legalAccepted, setLegalAccepted] = useState(false);
  const parsed = parseAuthPhoneNumber(phone, country); const next = localizePath(safeNextPath(searchParams.get("next"), "/profile"), locale);
  useEffect(() => { if (phone.trim().startsWith("+")) { const result = parseAuthPhoneNumber(phone, country); if (result.ok && result.country !== country) setCountry(result.country); } }, [phone, country]);
  const title = purpose === "registration" ? copy.createAccountTitle : purpose === "recovery" ? copy.forgotPasswordTitle : copy.legacyTitle;
  const body = purpose === "registration" ? copy.createAccountBody : purpose === "recovery" ? copy.forgotPasswordBody : copy.legacyBody;
  async function submit() {
    setError(null); if (!parsed.ok) { setError(authErrorMessage(parsed.error === "ambiguous_country" ? "ambiguous_phone_country" : "invalid_phone", locale)); return; }
    if (purpose === "registration" && !legalAccepted) { setError(copy.legalAcceptanceRequired); return; }
    if (!hasSupabaseEnv()) { setError(copy.authConfiguration); return; }
    const metadata = buildPhoneSignupMetadata({ selectedCountry: country, locale }); if (!metadata) { setError(authErrorMessage("invalid_phone", locale)); return; }
    setLoading(true); const { error: otpError } = await getSupabaseBrowserClient().auth.signInWithOtp({ phone: parsed.e164, options: { shouldCreateUser: purpose === "registration", ...(purpose === "registration" ? { data: metadata } : {}) } }); setLoading(false);
    if (otpError) { setError(authErrorMessage(mapAuthError(otpError, "otp_send_failed"), locale)); return; }
    saveOtpPhoneTransaction(createOtpPhoneTransaction(parsed.e164, country, purpose, legalAccepted)); router.push(localizePath(`/otp?next=${encodeURIComponent(next)}`, locale));
  }
  return <div className="mx-auto max-w-md rounded-oto border border-oto-border bg-white p-5 shadow-soft"><p className="text-xs font-black uppercase tracking-wide text-oto-blue">Jolmod</p><h1 className="mt-2 text-2xl font-black text-oto-text">{title}</h1><p className="mt-2 text-sm leading-6 text-oto-muted">{body}</p><div className="mt-5 grid gap-4"><PhoneInput value={phone} onChange={setPhone} selectedCountry={country} onCountryChange={setCountry} locale={locale} label={copy.phoneLabel} countryLabel={copy.countryLabel} searchLabel={copy.countrySearchLabel} searchPlaceholder={copy.countrySearchPlaceholder} placeholder={copy.phonePlaceholder} noResults={copy.countryNoResults} helperText={copy.phoneInputHelper} />{purpose === "registration" ? <label className="flex gap-2 text-sm leading-6 text-oto-muted"><input type="checkbox" checked={legalAccepted} onChange={(event) => setLegalAccepted(event.target.checked)} /><span>{copy.legalAcceptancePrefix} <Link className="font-bold text-oto-blue" href={localizePath("/terms", locale)}>{getJolmodLegalDocument("terms", locale).title}</Link>, <Link className="font-bold text-oto-blue" href={localizePath("/privacy", locale)}>{getJolmodLegalDocument("privacy", locale).title}</Link> {copy.legalAcceptanceAnd} <Link className="font-bold text-oto-blue" href={localizePath("/personal-data-consent", locale)}>{getJolmodLegalDocument("consent", locale).title}</Link>.</span></label> : null}{error ? <ErrorState message={error} /> : null}<Button onClick={submit} disabled={loading || !parsed.ok || (purpose === "registration" && !legalAccepted)}>{loading ? copy.sending : copy.sendCode}</Button><Link className="text-center text-sm font-bold text-oto-blue" href={`${localizePath("/login", locale)}?next=${encodeURIComponent(next)}`}>{copy.backToLogin}</Link></div></div>;
}
