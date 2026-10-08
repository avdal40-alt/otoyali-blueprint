"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { authErrorMessage, mapAuthError, safeNextPath } from "@/lib/auth/auth-ui";
import { completePasswordEnrollment, getPasswordEnrollmentStatus, type PasswordEnrollmentMethod } from "@/lib/auth/password-enrollment";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

const MIN_PASSWORD_LENGTH = 10;
export function PasswordEnrollmentClient({ reset = false }: { reset?: boolean }) {
  const { locale, dictionary } = useI18n(); const router = useRouter(); const searchParams = useSearchParams();
  const [ready, setReady] = useState(false); const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState(""); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  const next = safeNextPath(searchParams.get("next"), localizePath("/profile", locale));
  const methodParam = searchParams.get("method"); const method: PasswordEnrollmentMethod = reset ? "recovery_reset" : methodParam === "registration" ? "registration" : "legacy_enrollment";
  useEffect(() => { async function guard() { if (!hasSupabaseEnv()) { setError(String(dictionary.errors.authConfiguration)); setReady(true); return; } const supabase = getSupabaseBrowserClient(); const { data } = await supabase.auth.getUser(); if (!data.user) { router.replace(localizePath(`/login?next=${encodeURIComponent(next)}`, locale)); return; } if (!reset) { const status = await getPasswordEnrollmentStatus(supabase); if (!status.error && status.enrolled) { router.replace(next); return; } } setReady(true); } void guard(); }, [dictionary.errors.authConfiguration, locale, next, reset, router]);
  async function submit() { setError(null); if (password.length < MIN_PASSWORD_LENGTH) { setError(String(dictionary.auth.weakPassword)); return; } if (password !== confirmation) { setError(String(dictionary.auth.passwordMismatch)); return; } if (!hasSupabaseEnv()) { setError(String(dictionary.errors.authConfiguration)); return; }
    setLoading(true); const supabase = getSupabaseBrowserClient(); const { error: updateError } = await supabase.auth.updateUser({ password }); if (updateError) { setLoading(false); setError(authErrorMessage(mapAuthError(updateError), locale)); return; }
    const markerError = await completePasswordEnrollment(supabase, method); setLoading(false); if (markerError) { setError(String(dictionary.auth.enrollmentRetry)); return; } router.replace(next);
  }
  if (!ready) return <LoadingState />;
  const title = reset ? String(dictionary.auth.resetPasswordTitle) : String(dictionary.auth.createPasswordTitle); const action = reset ? String(dictionary.auth.resetPassword) : String(dictionary.auth.createPassword);
  return <div className="mx-auto max-w-md rounded-oto border border-oto-border bg-white p-5 shadow-soft"><p className="text-xs font-black uppercase tracking-wide text-oto-blue">Yolmod</p><h1 className="mt-2 text-2xl font-black text-oto-text">{title}</h1><p className="mt-2 text-sm leading-6 text-oto-muted">{String(dictionary.auth.passwordRequirements)}</p><div className="mt-5 grid gap-4"><label className="grid gap-1 text-sm font-bold text-oto-text">{String(dictionary.auth.passwordLabel)}<input className="h-11 rounded-button border border-oto-border px-3" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label className="grid gap-1 text-sm font-bold text-oto-text">{String(dictionary.auth.confirmPasswordLabel)}<input className="h-11 rounded-button border border-oto-border px-3" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>{error ? <ErrorState message={error} /> : null}<Button onClick={submit} disabled={loading || !password || !confirmation}>{loading ? String(dictionary.auth.savingPassword) : action}</Button></div></div>;
}
