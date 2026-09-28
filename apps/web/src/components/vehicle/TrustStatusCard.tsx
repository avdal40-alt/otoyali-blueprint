"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type TrustData = {
  providerStatus: "not_configured" | "unavailable" | "consent_required" | "available";
  vinPresence: "missing" | "present";
  vinFormatStatus: "valid_structure" | "invalid_structure" | "not_checked";
  signals: Array<{ code: "vin_present" | "vin_format_valid" | "vin_format_invalid" | "vin_reference_review_required" | "external_check_not_available" | "external_check_requires_consent"; provenance: "seller_supplied" | "yolmod_internal" | "external_provider" | "unavailable" }>;
};

type TrustCopy = {
  title: string;
  loading: string;
  unavailable: string;
  vinMissing: string;
  provider: Record<TrustData["providerStatus"], string>;
  signal: Record<TrustData["signals"][number]["code"], string>;
  provenance: Record<TrustData["signals"][number]["provenance"], string>;
};

/** Owner-only display. The server route remains the authorization boundary. */
export function TrustStatusCard({ listingId }: { listingId: string }) {
  const { dictionary } = useI18n();
  const copy = dictionary.ai.trust as unknown as TrustCopy;
  const [state, setState] = useState<{ kind: "checking" } | { kind: "loading" } | { kind: "ready"; data: TrustData } | { kind: "unavailable" } | { kind: "hidden" }>({ kind: "checking" });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const session = (await getSupabaseBrowserClient().auth.getSession()).data.session;
        if (!session?.access_token) return active ? setState({ kind: "hidden" }) : undefined;
        if (active) setState({ kind: "loading" });
        const response = await fetch("/api/ai/trust", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ listingId })
        });
        const payload = await response.json() as { data?: TrustData };
        if (!active) return;
        if (response.status === 401 || response.status === 403) return setState({ kind: "hidden" });
        setState(response.ok && payload.data ? { kind: "ready", data: payload.data } : { kind: "unavailable" });
      } catch {
        if (active) setState({ kind: "hidden" });
      }
    }
    void load();
    return () => { active = false; };
  }, [listingId]);

  if (state.kind === "checking" || state.kind === "hidden") return null;
  return (
    <section className="h-full rounded-oto border border-oto-border bg-white p-5 shadow-soft" aria-labelledby="trust-status-title">
      <h2 id="trust-status-title" className="text-lg font-bold text-oto-text">{copy.title}</h2>
      {state.kind === "loading" ? <p className="mt-3 text-sm font-semibold text-oto-muted" role="status" aria-live="polite">{copy.loading}</p> : null}
      {state.kind === "unavailable" ? <p className="mt-3 text-sm font-semibold leading-6 text-oto-muted">{copy.unavailable}</p> : null}
      {state.kind === "ready" ? <TrustResultView data={state.data} copy={copy} /> : null}
    </section>
  );
}

function TrustResultView({ data, copy }: { data: TrustData; copy: TrustCopy }) {
  return (
    <div className="mt-4 grid gap-3">
      {data.vinPresence === "missing" ? <p className="rounded-md bg-oto-surface p-3 text-sm font-semibold leading-6 text-oto-muted">{copy.vinMissing}</p> : null}
      {data.signals.map((signal) => (
        <div key={signal.code} className="rounded-md border border-oto-border p-3">
          <p className="text-sm font-black text-oto-text">{copy.signal[signal.code]}</p>
          <p className="mt-1 text-xs font-semibold text-oto-muted">{copy.provenance[signal.provenance]}</p>
        </div>
      ))}
      <p className="rounded-md bg-oto-surface p-3 text-sm font-semibold leading-6 text-oto-muted">{copy.provider[data.providerStatus]}</p>
    </div>
  );
}
