"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhoneInput } from "@/components/auth/PhoneInput";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { authErrorMessage, isMissingAuthSessionError, mapAuthError } from "@/lib/auth/auth-ui";
import { safeAdminNextPath } from "@/lib/auth/admin-return-path";
import { DEFAULT_PHONE_COUNTRY, parseAuthPhoneNumber, type AuthPhoneCountry } from "@/lib/auth/phone";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/client";
import { getAuthCopy } from "@/lib/auth/auth-copy";

type AccessState = "checking" | "ready" | "denied" | "error";

export function AdminLoginClient() {
  const { locale } = useI18n();
  const copy = getAuthCopy(locale);
  const adminCopy = getAdminLoginCopy(locale);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<AuthPhoneCountry>(DEFAULT_PHONE_COUNTRY);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [access, setAccess] = useState<AccessState>("checking");
  const next = safeAdminNextPath(searchParams.get("next"));
  const parsed = parseAuthPhoneNumber(phone, country);

  useEffect(() => {
    if (phone.trim().startsWith("+")) {
      const result = parseAuthPhoneNumber(phone, country);
      if (result.ok && result.country !== country) setCountry(result.country);
    }
  }, [phone, country]);

  useEffect(() => {
    async function checkExistingSession() {
      if (!hasSupabaseEnv()) {
        setAccess("error");
        setError(copy.authConfiguration);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError && !isMissingAuthSessionError(userError.message)) {
        setAccess("error");
        setError(authErrorMessage(mapAuthError(userError), locale));
        return;
      }
      if (!data.user) {
        setAccess("ready");
        return;
      }

      const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin", { uid: data.user.id });
      if (adminError) {
        setAccess("error");
        setError(adminCopy.verifyFailed);
        return;
      }
      if (isAdmin) {
        router.replace(next);
        return;
      }
      setAccess("denied");
    }

    void checkExistingSession();
  }, [adminCopy.verifyFailed, copy.authConfiguration, locale, next, router]);

  async function verifyAdminAndRedirect() {
    const supabase = getSupabaseBrowserClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      setError(authErrorMessage(mapAuthError(userError, "missing_session"), locale));
      return;
    }
    const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin", { uid: userData.user.id });
    if (adminError) {
      setError(adminCopy.verifyFailed);
      return;
    }
    if (!isAdmin) {
      setAccess("denied");
      return;
    }
    router.replace(next);
  }

  async function submit() {
    setError(null);
    if (!parsed.ok) {
      setError(authErrorMessage(parsed.error === "ambiguous_country" ? "ambiguous_phone_country" : "invalid_phone", locale));
      return;
    }
    if (!password) {
      setError(copy.passwordRequired);
      return;
    }
    if (!hasSupabaseEnv()) {
      setError(copy.authConfiguration);
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({ phone: parsed.e164, password });
    if (loginError) {
      setLoading(false);
      setError(authErrorMessage(mapAuthError(loginError, "invalid_credentials"), locale));
      return;
    }
    await verifyAdminAndRedirect();
    setLoading(false);
  }

  async function switchAccount() {
    setLoading(true);
    setError(null);
    await getSupabaseBrowserClient().auth.signOut();
    setAccess("ready");
    setPhone("");
    setPassword("");
    setLoading(false);
  }

  if (access === "checking") return <LoadingState />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-oto-surface px-4 py-10">
      <section className="w-full max-w-md rounded-oto border border-oto-border bg-white p-6 shadow-soft" aria-labelledby="admin-login-title">
        <p className="text-xs font-black uppercase tracking-wide text-oto-blue">Jolmod Admin</p>
        <h1 id="admin-login-title" className="mt-2 text-2xl font-black text-oto-text">Jolmod Admin</h1>
        <p className="mt-2 text-sm leading-6 text-oto-muted">{adminCopy.subtitle}</p>

        {access === "denied" ? (
          <div className="mt-5 grid gap-4">
            <ErrorState message={adminCopy.accessDenied} />
            <Button type="button" onClick={() => void switchAccount()} disabled={loading}>{adminCopy.switchAccount}</Button>
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            <PhoneInput value={phone} onChange={setPhone} selectedCountry={country} onCountryChange={setCountry} locale={locale} label={copy.phoneLabel} countryLabel={copy.countryLabel} searchLabel={copy.countrySearchLabel} searchPlaceholder={copy.countrySearchPlaceholder} placeholder={copy.phonePlaceholder} noResults={copy.countryNoResults} helperText={copy.phoneInputHelper} />
            <Input label={copy.passwordLabel} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            {error ? <ErrorState message={error} /> : null}
            <Button type="button" onClick={() => void submit()} disabled={loading || !parsed.ok || !password}>{loading ? copy.signingIn : copy.signIn}</Button>
          </div>
        )}
      </section>
    </main>
  );
}

function getAdminLoginCopy(locale: string) {
  const copy = {
    ru: { subtitle: "Вход в панель управления", verifyFailed: "Не удалось проверить доступ администратора. Повторите попытку.", accessDenied: "У этого аккаунта нет доступа к панели управления.", switchAccount: "Войти с другим аккаунтом" },
    kk: { subtitle: "Басқару панеліне кіру", verifyFailed: "Әкімші рұқсатын тексеру мүмкін болмады. Қайталап көріңіз.", accessDenied: "Бұл тіркелгінің басқару панеліне кіру рұқсаты жоқ.", switchAccount: "Басқа тіркелгімен кіру" },
    en: { subtitle: "Sign in to the administration panel", verifyFailed: "Administrator access could not be verified. Try again.", accessDenied: "This account does not have access to the administration panel.", switchAccount: "Sign in with another account" },
    "zh-CN": { subtitle: "登录管理面板", verifyFailed: "无法验证管理员权限，请重试。", accessDenied: "此账户无权访问管理面板。", switchAccount: "使用其他账户登录" }
  } as const;
  return locale === "kk" || locale === "en" || locale === "zh-CN" ? copy[locale] : copy.ru;
}
