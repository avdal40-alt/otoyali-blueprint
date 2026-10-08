"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneInput } from "@/components/auth/PhoneInput";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { authErrorMessage, mapAuthError, safeNextPath } from "@/lib/auth/auth-ui";
import { getPasswordEnrollmentStatus } from "@/lib/auth/password-enrollment";
import { DEFAULT_PHONE_COUNTRY, parseAuthPhoneNumber, type AuthPhoneCountry } from "@/lib/auth/phone";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

export function LoginClient() {
  const { locale, dictionary } = useI18n(); const router = useRouter(); const searchParams = useSearchParams();
  const [phone, setPhone] = useState(""); const [country, setCountry] = useState<AuthPhoneCountry>(DEFAULT_PHONE_COUNTRY); const [password, setPassword] = useState(""); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  const parsed = parseAuthPhoneNumber(phone, country); const next = localizePath(safeNextPath(searchParams.get("next"), "/profile"), locale);
  useEffect(() => { if (phone.trim().startsWith("+")) { const result = parseAuthPhoneNumber(phone, country); if (result.ok && result.country !== country) setCountry(result.country); } }, [phone, country]);
  async function submit() {
    setError(null); if (!parsed.ok) { setError(authErrorMessage(parsed.error === "ambiguous_country" ? "ambiguous_phone_country" : "invalid_phone", locale)); return; } if (!password) { setError(String(dictionary.auth.passwordRequired)); return; } if (!hasSupabaseEnv()) { setError(String(dictionary.errors.authConfiguration)); return; }
    setLoading(true); const supabase = getSupabaseBrowserClient(); const { error: loginError } = await supabase.auth.signInWithPassword({ phone: parsed.e164, password });
    if (loginError) { setLoading(false); setError(authErrorMessage(mapAuthError(loginError, "invalid_credentials"), locale)); return; }
    const status = await getPasswordEnrollmentStatus(supabase); setLoading(false);
    if (status.error || !status.enrolled) { router.replace(localizePath(`/auth/create-password?next=${encodeURIComponent(next)}&method=legacy_enrollment`, locale)); return; }
    router.replace(next);
  }
  const withNext = (path: string) => `${localizePath(path, locale)}?next=${encodeURIComponent(next)}`;
  return <div className="mx-auto max-w-md rounded-oto border border-oto-border bg-white p-5 shadow-soft"><p className="text-xs font-black uppercase tracking-wide text-oto-blue">Yolmod</p><h1 className="mt-2 text-2xl font-black text-oto-text">{String(dictionary.auth.loginTitle)}</h1><p className="mt-2 text-sm leading-6 text-oto-muted">{String(dictionary.auth.loginBody)}</p><div className="mt-5 grid gap-4"><PhoneInput value={phone} onChange={setPhone} selectedCountry={country} onCountryChange={setCountry} locale={locale} label={String(dictionary.auth.phoneLabel)} countryLabel={String(dictionary.auth.countryLabel)} searchLabel={String(dictionary.auth.countrySearchLabel)} searchPlaceholder={String(dictionary.auth.countrySearchPlaceholder)} placeholder={String(dictionary.auth.phonePlaceholder)} noResults={String(dictionary.auth.countryNoResults)} helperText={String(dictionary.auth.phoneInputHelper)} /><label className="grid gap-1 text-sm font-bold text-oto-text">{String(dictionary.auth.passwordLabel)}<input className="h-11 rounded-button border border-oto-border px-3" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error ? <ErrorState message={error} /> : null}<Button onClick={submit} disabled={loading || !parsed.ok || !password}>{loading ? String(dictionary.auth.signingIn) : String(dictionary.auth.signIn)}</Button><div className="grid gap-2 text-center text-sm font-bold text-oto-blue"><Link href={withNext("/register")}>{String(dictionary.auth.createAccount)}</Link><Link href={withNext("/auth/forgot-password")}>{String(dictionary.auth.forgotPassword)}</Link><Link href={withNext("/auth/legacy-enrollment")}>{String(dictionary.auth.legacyLink)}</Link></div></div></div>;
}
