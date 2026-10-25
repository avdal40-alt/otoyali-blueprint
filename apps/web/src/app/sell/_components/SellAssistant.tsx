"use client";

import { FormEvent, KeyboardEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Locale } from "@/i18n/types";
import { AiStateMessage } from "@/features/ai/components/AiStateMessage";
import { getSellAssistantCopy } from "./sell-assistant-copy";

export type AssistedListingDraft = Record<string, string | number | boolean | null | undefined>;
type AssistantState = { draft: AssistedListingDraft; missingFields: string[]; nextQuestion?: string; clarification?: { message: string }; readyForReview: boolean };
export function SellAssistant({ locale, draft, onApply }: { locale: Locale; draft: AssistedListingDraft; onApply: (draft: AssistedListingDraft) => void }) {
  const t = getSellAssistantCopy(locale); const fieldsCopy = t.fields; const [open, setOpen] = useState(false); const [message, setMessage] = useState(""); const [state, setState] = useState<AssistantState | null>(null); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const fields = useMemo(() => [["year", fieldsCopy.year], ["mileageKm", fieldsCopy.mileageKm], ["condition", fieldsCopy.condition], ["fuelType", fieldsCopy.fuelType], ["transmission", fieldsCopy.transmission], ["engineVolumeL", fieldsCopy.engineVolumeL], ["priceAmount", fieldsCopy.priceAmount], ["city", fieldsCopy.city]] as const, [fieldsCopy]);
  async function request(text = message) {
    if (busy || !text.trim()) return;
    setBusy(true); setError(null);
    try { const session = (await getSupabaseBrowserClient().auth.getSession()).data.session; if (!session) throw new Error("auth_required");
      const response = await fetch("/api/ai/sell", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ locale, message: text, draft, action: "turn" }) });
      const body = await response.json(); if (!response.ok || !body.data?.state) throw new Error(body.error?.code ?? "failure"); setState(body.data.state); setMessage("");
    } catch { setError(t.error); } finally { setBusy(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void request(); }
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void request(); } }
  if (!open) return <section className="rounded-oto border border-oto-border bg-white p-4 shadow-soft"><h2 className="font-black text-oto-text">{t.title}</h2><p className="mt-1 text-sm text-oto-muted">{t.help}</p><Button className="mt-3" type="button" variant="secondary" onClick={() => setOpen(true)}>{t.open}</Button></section>;
  const suggested = state?.draft ?? draft;
  return <section className="rounded-oto border border-oto-blue/30 bg-white p-4 shadow-soft" aria-labelledby="sell-assistant-title"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="sell-assistant-title" className="font-black text-oto-text">{t.title}</h2><p className="text-sm text-oto-muted">{t.help}</p></div><Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={busy}>{t.close}</Button></div><form className="mt-4" onSubmit={submit}><label htmlFor="sell-assistant-message" className="font-bold text-sm text-oto-text">{t.label}</label><Textarea id="sell-assistant-message" value={message} maxLength={2000} rows={3} placeholder={t.placeholder} onChange={(event) => setMessage(event.target.value)} onKeyDown={keyDown} disabled={busy} aria-describedby="sell-assistant-status" /><div className="mt-2 flex flex-wrap gap-2"><Button type="submit" disabled={busy || !message.trim()}>{busy ? t.sending : t.send}</Button><Button type="button" variant="secondary" disabled={busy} onClick={() => { setState(null); setMessage(""); setError(null); }}>{t.reset}</Button></div></form><div id="sell-assistant-status" className="mt-3" aria-atomic="true">{busy ? <AiStateMessage state="loading">{t.sending}</AiStateMessage> : null}{error ? <AiStateMessage state="error">{error}</AiStateMessage> : null}{state?.clarification ? <p className="text-sm font-bold text-oto-text">{state.clarification.message}</p> : null}{state?.nextQuestion ? <p className="text-sm font-bold text-oto-text">{state.nextQuestion}</p> : null}</div>{state ? <section className="mt-4 rounded-md border border-oto-border p-3" aria-label={t.summary}><h3 className="font-bold text-oto-text">{t.summary}</h3><dl className="mt-2 space-y-1 text-sm">{fields.map(([key, label]) => <div key={key} className="flex justify-between gap-3"><dt className="text-oto-muted">{label}</dt><dd className={suggested[key] === undefined || suggested[key] === null || suggested[key] === "" ? "font-bold text-amber-700" : "font-bold text-oto-text"}>{suggested[key] === undefined || suggested[key] === null || suggested[key] === "" ? t.missing : String(suggested[key])}</dd></div>)}</dl><Button className="mt-3" type="button" disabled={busy} onClick={() => { onApply(state.draft); setState(null); }}>{t.apply}</Button></section> : null}</section>;
}
