"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneInput } from "@/components/auth/PhoneInput";
import { Button } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { authErrorMessage, mapAuthError, safeNextPath } from "@/lib/auth/auth-ui";
import { createOtpPhoneTransaction, saveOtpPhoneTransaction } from "@/lib/auth/otp-transaction";
import { DEFAULT_PHONE_COUNTRY, parseAuthPhoneNumber, type AuthPhoneCountry } from "@/lib/auth/phone";
import { buildPhoneSignupMetadata } from "@/lib/auth/signup-metadata";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

export function LoginClient() {
  const { locale, dictionary } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"), localizePath("/profile", locale));
  const [phone, setPhone] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<AuthPhoneCountry>(DEFAULT_PHONE_COUNTRY);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const phoneResult = parseAuthPhoneNumber(phone, selectedCountry);
  const isValidPhone = phoneResult.ok;

  useEffect(() => {
    if (!phone.trim().startsWith("+")) return;

    const result = parseAuthPhoneNumber(phone, selectedCountry);
    if (result.ok && result.country !== selectedCountry) {
      setSelectedCountry(result.country);
    }
  }, [phone, selectedCountry]);

  async function submit() {
    setError(null);

    if (!phoneResult.ok) {
      const category = phoneResult.error === "ambiguous_country" ? "ambiguous_phone_country" : "invalid_phone";
      setError(authErrorMessage(category, locale));
      return;
    }

    if (!hasSupabaseEnv()) {
      setError(String(dictionary.errors.missingSupabaseEnv));
      return;
    }

    const signupMetadata = buildPhoneSignupMetadata({ selectedCountry, locale });
    if (!signupMetadata) {
      setError(authErrorMessage("invalid_phone", locale));
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      phone: phoneResult.e164,
      options: {
        shouldCreateUser: true,
        data: signupMetadata
      }
    });
    setLoading(false);

    if (otpError) {
      setError(authErrorMessage(mapAuthError(otpError, "otp_send_failed"), locale));
      return;
    }

    saveOtpPhoneTransaction(createOtpPhoneTransaction(phoneResult.e164, signupMetadata.country));
    router.push(localizePath(`/otp?next=${encodeURIComponent(next)}`, locale));
  }

  return (
    <div className="mx-auto max-w-md rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <p className="text-xs font-black uppercase tracking-wide text-oto-blue">OTOYALI</p>
      <h1 className="mt-2 text-2xl font-black text-oto-text">{String(dictionary.auth.loginTitle)}</h1>
      <p className="mt-2 text-sm leading-6 text-oto-muted">{String(dictionary.auth.loginBody)}</p>
      <p className="mt-3 rounded-md bg-oto-surface p-3 text-xs font-semibold leading-5 text-oto-muted">
        {String(dictionary.auth.phoneHint)}
      </p>
      <div className="mt-5 grid gap-4">
        <PhoneInput
          value={phone}
          onChange={setPhone}
          selectedCountry={selectedCountry}
          onCountryChange={setSelectedCountry}
          locale={locale}
          label={String(dictionary.auth.phoneLabel)}
          countryLabel={String(dictionary.auth.countryLabel)}
          searchLabel={String(dictionary.auth.countrySearchLabel)}
          searchPlaceholder={String(dictionary.auth.countrySearchPlaceholder)}
          placeholder={String(dictionary.auth.phonePlaceholder)}
          noResults={String(dictionary.auth.countryNoResults)}
          helperText={String(dictionary.auth.phoneInputHelper)}
        />
        {error ? <ErrorState message={error} /> : null}
        <Button onClick={submit} disabled={loading || !isValidPhone}>
          {loading ? String(dictionary.auth.sending) : String(dictionary.auth.sendCode)}
        </Button>
      </div>
    </div>
  );
}
