"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { SellerContactVerificationFlow } from "@/components/seller/SellerContactVerificationFlow";
import { Button } from "@/components/ui/Button";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import {
  resolvePlatformStaffState,
  type PlatformStaffClient,
} from "@/lib/auth/platform-staff";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type GateState = "checking" | "phone" | "error" | "eligible";
type ApiFailure = "eligibility_unavailable";
type SellerContact = { contact_id: string; masked_phone: string; is_current_account_phone: boolean; is_active: boolean };

function messageFor(code: ApiFailure | null, dictionary: ReturnType<typeof useI18n>["dictionary"]) {
  if (code === "eligibility_unavailable") return String(dictionary.sell.sellerPhoneUnavailable);
  return String(dictionary.sell.sellerPhoneGenericError);
}

export function SellerEntryGate({ children }: { children: ReactNode }) {
  const { locale, dictionary } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [state, setState] = useState<GateState>("checking");
  const [errorCode, setErrorCode] = useState<ApiFailure | null>(null);
  const returnPath = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;

  const redirectToLogin = useCallback(() => {
    router.replace(localizePath(`/login?next=${encodeURIComponent(returnPath)}`, locale));
  }, [locale, returnPath, router]);

  const getAccessToken = useCallback(async () => {
    if (!hasSupabaseEnv()) return null;
    const { data } = await getSupabaseBrowserClient().auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const checkEligibility = useCallback(async () => {
    setState("checking");
    setErrorCode(null);
    const accessToken = await getAccessToken();
    if (!accessToken) {
      redirectToLogin();
      return false;
    }

    const supabase = getSupabaseBrowserClient();
    const staffState = await resolvePlatformStaffState(
      supabase as unknown as PlatformStaffClient,
    );
    if (staffState === "anonymous") {
      redirectToLogin();
      return false;
    }
    if (staffState === "staff" || staffState === "unknown") {
      router.replace(localizePath("/admin", locale));
      return false;
    }
    // The database derives the phone and confirmation fact from auth.users; the
    // browser supplies no phone value and cannot create a contact directly.
    await supabase.rpc("sync_own_verified_account_phone");
    const { data: contactRows } = await supabase.rpc("list_own_verified_seller_contact_phones");
    const verifiedContacts = Array.isArray(contactRows) ? contactRows as SellerContact[] : [];
    if (verifiedContacts.some((contact) => contact.is_active)) { setState("eligible"); return true; }
    let response: Response;
    try {
      response = await fetch("/api/seller/eligibility", { headers: { Authorization: `Bearer ${accessToken}` } });
    } catch {
      setErrorCode("eligibility_unavailable");
      setState("error");
      return false;
    }
    if (response.status === 401) {
      redirectToLogin();
      return false;
    }
    const body = await response.json().catch(() => null) as { data?: { eligible?: unknown }; error?: { code?: unknown } } | null;
    if (!response.ok || typeof body?.data?.eligible !== "boolean") {
      setErrorCode(typeof body?.error?.code === "string" ? body.error.code as ApiFailure : "eligibility_unavailable");
      setState("error");
      return false;
    }
    setState(body.data.eligible ? "eligible" : "phone");
    return body.data.eligible;
  }, [getAccessToken, locale, redirectToLogin, router]);

  useEffect(() => { void checkEligibility(); }, [checkEligibility]);

  if (state === "eligible") return <>{children}</>;
  if (state === "checking") return <LoadingState label={String(dictionary.sell.sellerPhoneChecking)} />;

  const error = errorCode ? messageFor(errorCode, dictionary) : null;
  return (
    <section className="mx-auto max-w-md rounded-oto border border-oto-border bg-white p-5 shadow-soft md:p-6" aria-labelledby="seller-phone-verification-title">
      <p className="text-xs font-black uppercase tracking-wide text-oto-blue">Jolcar</p>
      <h2 id="seller-phone-verification-title" className="mt-2 text-2xl font-black text-oto-text">{String(dictionary.sell.sellerPhoneTitle)}</h2>
      <p className="mt-2 text-sm leading-6 text-oto-muted">{String(dictionary.sell.sellerPhoneBody)}</p>
      <p className="mt-3 rounded-md bg-oto-surface p-3 text-xs font-semibold leading-5 text-oto-muted">{String(dictionary.sell.sellerPhoneAuthIndependent)}</p>
      {error ? <div className="mt-5"><ErrorState message={error} /><Button className="mt-4" type="button" variant="secondary" onClick={() => void checkEligibility()}>{String(dictionary.sell.sellerPhoneRetry)}</Button></div> : null}
      {state === "phone" ? <div className="mt-5"><SellerContactVerificationFlow onVerified={async () => { await checkEligibility(); }} onAuthRequired={redirectToLogin} /></div> : null}
    </section>
  );
}
