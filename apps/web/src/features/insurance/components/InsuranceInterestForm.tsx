"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox, Select } from "@/components/ui/Input";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { localizePath } from "@/i18n/config";
import { t } from "@/i18n/get-dictionary";
import { useI18n } from "@/i18n/client";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

type AuthState = "loading" | "ready" | "login" | "error";
type InterestType = "mandatory" | "comprehensive" | "renewal" | "claims_information" | "general";
const interestTypes: InterestType[] = ["mandatory", "comprehensive", "renewal", "claims_information", "general"];

export function InsuranceInterestForm() {
  const { locale } = useI18n();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [interestType, setInterestType] = useState<InterestType>("mandatory");
  const [consented, setConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAuthState() {
      if (!hasSupabaseEnv()) {
        setAuthState("error");
        setError(t(locale, "errors.missingSupabaseEnv"));
        return;
      }
      const { data, error: authError } = await getSupabaseBrowserClient().auth.getUser();
      if (authError) {
        setAuthState("error");
        setError(t(locale, "insurance.lead.error"));
        return;
      }
      setAuthState(data.user ? "ready" : "login");
    }
    void loadAuthState();
  }, [locale]);

  async function submit() {
    setError(null);
    if (!consented) return;
    setSubmitting(true);
    const { error: rpcError } = await getSupabaseBrowserClient().rpc("submit_own_insurance_interest", {
      p_interest_type: interestType,
      p_consent: true
    });
    setSubmitting(false);
    if (rpcError) {
      setError(t(locale, "insurance.lead.error"));
      return;
    }
    setSubmitted(true);
  }

  if (authState === "loading") return <LoadingState />;
  if (authState === "error") return <ErrorState message={error ?? t(locale, "insurance.lead.error")} />;
  if (authState === "login") {
    const next = localizePath("/sigorta", locale);
    return <Card padding="lg"><Badge>{t(locale, "insurance.lead.badge")}</Badge><h2 className="mt-4 text-2xl font-black text-oto-text">{t(locale, "insurance.lead.loginTitle")}</h2><p className="mt-3 text-sm font-semibold leading-6 text-oto-muted">{t(locale, "insurance.lead.loginBody")}</p><ButtonLink className="mt-5" variant="orange" href={`${localizePath("/login", locale)}?next=${encodeURIComponent(next)}`}>{t(locale, "insurance.lead.loginCta")}</ButtonLink></Card>;
  }
  if (submitted) return <Card padding="lg"><Badge variant="active">{t(locale, "insurance.lead.badge")}</Badge><h2 className="mt-4 text-2xl font-black text-oto-text">{t(locale, "insurance.lead.successTitle")}</h2><p className="mt-3 text-sm font-semibold leading-6 text-oto-muted">{t(locale, "insurance.lead.successBody")}</p></Card>;

  return <Card padding="lg"><Badge>{t(locale, "insurance.lead.badge")}</Badge><h2 className="mt-4 text-2xl font-black text-oto-text">{t(locale, "insurance.lead.title")}</h2><p className="mt-3 text-sm font-semibold leading-6 text-oto-muted">{t(locale, "insurance.lead.body")}</p><div className="mt-5 grid gap-4"><Select label={t(locale, "insurance.lead.typeLabel")} value={interestType} onChange={(event) => setInterestType(event.target.value as InterestType)}>{interestTypes.map((type) => <option key={type} value={type}>{t(locale, `insurance.lead.type.${type}`)}</option>)}</Select><Checkbox checked={consented} onChange={(event) => setConsented(event.target.checked)} label={t(locale, "insurance.lead.consent")} /><p className="text-xs font-semibold leading-5 text-oto-muted"><Link className="text-oto-blue underline" href={localizePath("/privacy", locale)}>{t(locale, "insurance.privacy")}</Link></p></div>{error ? <div className="mt-4"><ErrorState message={error} /></div> : null}<Button className="mt-5" variant="orange" onClick={submit} disabled={!consented} isLoading={submitting}>{t(locale, "insurance.lead.submit")}</Button></Card>;
}
