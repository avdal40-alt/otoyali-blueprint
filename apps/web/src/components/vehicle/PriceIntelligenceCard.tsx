"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
import { formatPrice } from "@/lib/format";

type PriceResult =
  | { available: false; reason: "insufficient_comparables" | "invalid_target" }
  | {
      available: true;
      currency: string;
      comparableCount: number;
      medianAskingPrice: number;
      lowerObservedPrice: number;
      upperObservedPrice: number;
      differencePercent: number;
      coverage: "low" | "medium" | "high";
      recency: "fresh" | "mixed" | "older";
    };

type PriceCopy = {
  title: string;
  loading: string;
  unavailable: string;
  insufficient: string;
  median: string;
  range: string;
  comparableCount: string;
  higher: string;
  lower: string;
  near: string;
  limited: string;
  fresh: string;
  mixed: string;
  older: string;
  explanation: string;
};

/** Renders only the bounded, server-derived asking-price result from AI-01F-A. */
export function PriceIntelligenceCard({ listingId }: { listingId: string }) {
  const { locale, dictionary } = useI18n();
  const copy = dictionary.ai.price as unknown as PriceCopy;
  const [state, setState] = useState<{ kind: "loading" } | { kind: "ready"; data: PriceResult } | { kind: "unavailable" }>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/ai/price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId })
        });
        const payload = await response.json() as { data?: PriceResult };
        if (!active) return;
        setState(response.ok && payload.data ? { kind: "ready", data: payload.data } : { kind: "unavailable" });
      } catch {
        if (active) setState({ kind: "unavailable" });
      }
    }
    void load();
    return () => { active = false; };
  }, [listingId]);

  return (
    <section className="h-full rounded-oto border border-oto-border bg-white p-5 shadow-soft" aria-labelledby="price-intelligence-title">
      <h2 id="price-intelligence-title" className="text-lg font-bold text-oto-text">{copy.title}</h2>
      {state.kind === "loading" ? <p className="mt-3 text-sm font-semibold text-oto-muted" role="status" aria-live="polite">{copy.loading}</p> : null}
      {state.kind === "unavailable" ? <p className="mt-3 text-sm font-semibold leading-6 text-oto-muted">{copy.unavailable}</p> : null}
      {state.kind === "ready" && !state.data.available ? <p className="mt-3 text-sm font-semibold leading-6 text-oto-muted">{copy.insufficient}</p> : null}
      {state.kind === "ready" && state.data.available ? <PriceResultView data={state.data} locale={locale} copy={copy} /> : null}
    </section>
  );
}

function PriceResultView({ data, locale, copy }: { data: Extract<PriceResult, { available: true }>; locale: "tr" | "en"; copy: PriceCopy }) {
  const absoluteDifference = Math.abs(data.differencePercent);
  const relation = absoluteDifference < 1 ? copy.near : data.differencePercent > 0 ? copy.higher : copy.lower;
  const recency = data.recency === "fresh" ? copy.fresh : data.recency === "mixed" ? copy.mixed : copy.older;

  return (
    <div className="mt-4 grid gap-3">
      <div className="rounded-md bg-oto-surface p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-oto-muted">{copy.median}</p>
        <p className="mt-1 text-xl font-black text-oto-text">{formatPrice(data.medianAskingPrice, data.currency, locale)}</p>
        <p className="mt-2 text-sm font-semibold leading-6 text-oto-muted">{relation.replace("{percent}", String(absoluteDifference))}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-oto-border p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-oto-muted">{copy.range}</p>
          <p className="mt-1 text-sm font-black text-oto-text">{formatPrice(data.lowerObservedPrice, data.currency, locale)} – {formatPrice(data.upperObservedPrice, data.currency, locale)}</p>
        </div>
        <div className="rounded-md border border-oto-border p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-oto-muted">{copy.comparableCount}</p>
          <p className="mt-1 text-sm font-black text-oto-text">{copy.comparableCount.replace("{count}", String(data.comparableCount))}</p>
        </div>
      </div>
      {data.coverage !== "high" ? <p className="text-xs font-semibold leading-5 text-oto-muted">{copy.limited}</p> : null}
      <p className="text-xs font-semibold leading-5 text-oto-muted">{recency}</p>
      <details className="text-xs font-semibold leading-5 text-oto-muted">
        <summary className="cursor-pointer text-oto-blue">{copy.explanation}</summary>
      </details>
    </div>
  );
}
