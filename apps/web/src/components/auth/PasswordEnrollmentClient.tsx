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
import { getAuthCopy } from "@/lib/auth/auth-copy";

const MIN_PASSWORD_LENGTH = 10;
export function PasswordEnrollmentClient({ reset = false }: { reset?: boolean }) {
  const { locale } = useI18n(); const copy = getAuthCopy(locale); const router = useRouter(); const searchParams = useSearchParams();
  const [ready, setReady] = useState(false); const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState(""); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  const next = localizePath(safeNextPath(searchParams.get("next"), "/profile"), locale);
  const methodParam = searchParams.get("method"); const method: PasswordEnrollmentMethod = reset ? "recovery_reset" : methodParam === "registration" ? "registration" : "legacy_enrollment";
  useEffect(() => { async function guard() { if (!hasSupabaseEnv()) { setError(copy.authConfiguration); setReady(true); return; } const supabase = getSupabaseBrowserClient(); const { data } = await supabase.auth.getUser(); if (!data.user) { router.replace(localizePath(`/login?next=${encodeURIComponent(next)}`, locale)); return; } if (!reset) { const status = await getPasswordEnrollmentStatus(supabase); if (!status.error && status.enrolled) { router.replace(next); return; } } setReady(true); } void guard(); }, [copy.authConfiguration, locale, next, reset, router]);
  async function submit() { setError(null); if (password.length < MIN_PASSWORD_LENGTH) { setError(copy.weakPassword); return; } if (password !== confirmation) { setError(copy.passwordMismatch); return; } if (!hasSupabaseEnv()) { setError(copy.authConfiguration); return; }
    setLoading(true); const supabase = getSupabaseBrowserClient(); const { error: updateError } = await supabase.auth.updateUser({ password }); if (updateError) { setLoading(false); setError(authErrorMessage(mapAuthError(updateError), locale)); return; }
    const markerError = await completePasswordEnrollment(supabase, method); setLoading(false); if (markerError) { setError(copy.enrollmentRetry); return; } router.replace(next);
  }
  if (!ready) return <LoadingState />;
  const title = reset ? copy.resetPasswordTitle : copy.createPasswordTitle; const action = reset ? copy.resetPassword : copy.createPassword;
  return <div className="mx-auto max-w-md rounded-oto border border-oto-border bg-white p-5 shadow-soft"><p className="text-xs font-black uppercase tracking-wide text-oto-blue">Jolmod</p><h1 className="mt-2 text-2xl font-black text-oto-text">{title}</h1><p className="mt-2 text-sm leading-6 text-oto-muted">{copy.passwordRequirements}</p><div className="mt-5 grid gap-4"><label className="grid gap-1 text-sm font-bold text-oto-text">{copy.passwordLabel}<input className="h-11 rounded-button border border-oto-border px-3" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><label className="grid gap-1 text-sm font-bold text-oto-text">{copy.confirmPasswordLabel}<input className="h-11 rounded-button border border-oto-border px-3" type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>{error ? <ErrorState message={error} /> : null}<Button onClick={submit} disabled={loading || !password || !confirmation}>{loading ? copy.savingPassword : action}</Button></div></div>;
}
