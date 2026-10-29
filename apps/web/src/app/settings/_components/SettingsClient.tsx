"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useI18n } from "@/i18n/client";
import { getLocaleDefinition, localizePath, SUPPORTED_LOCALES } from "@/i18n/config";
import { getSettingsCopy } from "./settings-copy";

export function SettingsClient() {
  const { locale } = useI18n();
  const settingsCopy = getSettingsCopy(locale);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    async function load() {
      if (!hasSupabaseEnv()) {
        setError(settingsCopy.missingSupabaseEnv);
        setLoading(false);
        return;
      }
      const supabase = getSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        setLoading(false);
        return;
      }
      const { data, error: profileError } = await supabase.from("profiles").select("*").eq("id", userData.user.id).maybeSingle();
      setProfile((data as Profile | null) ?? null);
      setError(profileError?.message ?? null);
      setLoading(false);
    }
    void load();
  }, [settingsCopy.missingSupabaseEnv]);

  async function save() {
    if (!profile) return;
    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ first_name: profile.first_name, last_name: profile.last_name, city: profile.city, language: profile.language })
      .eq("id", profile.id);
    if (updateError) setError(updateError.message);
  }

  async function changePassword() {
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword.length < 10) return setPasswordError(settingsCopy.passwordTooShort);
    if (newPassword !== passwordConfirmation) return setPasswordError(settingsCopy.passwordMismatch);
    if (newPassword === currentPassword) return setPasswordError(settingsCopy.passwordSame);
    if (!hasSupabaseEnv()) return setPasswordError(settingsCopy.missingSupabaseEnv);

    setChangingPassword(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      const phone = userData.user?.phone;
      if (userError || !phone) throw new Error("missing_phone");
      const { error: verifyError } = await supabase.auth.signInWithPassword({ phone, password: currentPassword });
      if (verifyError) throw new Error("invalid_current_password");
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setCurrentPassword("");
      setNewPassword("");
      setPasswordConfirmation("");
      setPasswordSuccess(true);
    } catch (changeError) {
      const code = changeError instanceof Error ? changeError.message : "";
      setPasswordError(code === "missing_phone" ? settingsCopy.missingPhone : code === "invalid_current_password" ? settingsCopy.currentPasswordIncorrect : settingsCopy.passwordChangeFailed);
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!profile) {
    return (
      <EmptyState
        title={settingsCopy.loginRequiredTitle}
        body={settingsCopy.loginRequiredBody}
        href={`${localizePath("/login", locale)}?next=${encodeURIComponent(localizePath("/settings", locale))}`}
        action={settingsCopy.loginRequiredAction}
      />
    );
  }

  return (
    <div className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <div className="grid gap-3 md:grid-cols-2">
        <Input value={profile.first_name ?? ""} onChange={(event) => setProfile({ ...profile, first_name: event.target.value })} placeholder={settingsCopy.firstName} />
        <Input value={profile.last_name ?? ""} onChange={(event) => setProfile({ ...profile, last_name: event.target.value })} placeholder={settingsCopy.lastName} />
        <Input value={profile.city ?? ""} onChange={(event) => setProfile({ ...profile, city: event.target.value })} placeholder={settingsCopy.city} />
        <Select value={profile.language} onChange={(event) => setProfile({ ...profile, language: event.target.value })}>
          {SUPPORTED_LOCALES.map((supportedLocale) => <option key={supportedLocale} value={supportedLocale}>{getLocaleDefinition(supportedLocale).nativeLabel}</option>)}
        </Select>
      </div>
      <Button onClick={save} className="mt-5">{settingsCopy.save}</Button>
      <section className="mt-8 border-t border-oto-border pt-6" aria-labelledby="settings-security-title">
        <h2 id="settings-security-title" className="text-lg font-black text-oto-text">{settingsCopy.security}</h2>
        <p className="mt-1 text-sm text-oto-muted">{settingsCopy.passwordRequirements}</p>
        <div className="mt-4 grid max-w-md gap-3">
          <Input type="password" autoComplete="current-password" label={settingsCopy.currentPassword} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
          <Input type="password" autoComplete="new-password" label={settingsCopy.newPassword} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
          <Input type="password" autoComplete="new-password" label={settingsCopy.confirmNewPassword} value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} error={passwordError} />
          {passwordSuccess ? <p className="text-sm font-bold text-oto-success" role="status">{settingsCopy.passwordChanged}</p> : null}
          <Button type="button" onClick={() => void changePassword()} disabled={changingPassword || !currentPassword || !newPassword || !passwordConfirmation}>{settingsCopy.changePassword}</Button>
        </div>
      </section>
    </div>
  );
}
