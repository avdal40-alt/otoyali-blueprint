"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type DescriptionDraft = Record<string, string | number | boolean | null | undefined>;
type DescriptionMode = "concise" | "standard" | "detailed";

export function ListingDescriptionAssistant({ locale, draft, onApply }: { locale: Locale; draft: DescriptionDraft; onApply: (description: string) => void }) {
  const { dictionary } = useI18n();
  const t = dictionary.ai.sellDescription as Record<"generate" | "generating" | "length" | "concise" | "standard" | "detailed" | "help" | "apply" | "discard" | "error" | "unavailable" | "previewLabel", string>;
  const [mode, setMode] = useState<DescriptionMode>("standard");
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = [draft.year, draft.mileageKm, draft.condition, draft.fuelType, draft.transmission].every((value) => value !== undefined && value !== null && value !== "");

  async function generate() {
    if (busy || !ready) return;
    setBusy(true);
    setError(null);
    try {
      const session = (await getSupabaseBrowserClient().auth.getSession()).data.session;
      if (!session) throw new Error("auth_required");
      const response = await fetch("/api/ai/sell", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" }, body: JSON.stringify({ locale, draft, action: "generate_description", descriptionMode: mode }) });
      const body: unknown = await response.json();
      const description = body && typeof body === "object" && "data" in body && body.data && typeof body.data === "object" && "state" in body.data && body.data.state && typeof body.data.state === "object" && "descriptionPreview" in body.data.state && typeof body.data.state.descriptionPreview === "string" ? body.data.state.descriptionPreview : null;
      if (!response.ok || !description) throw new Error("generation_failed");
      setPreview(description);
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  }

  return <div className="rounded-oto border border-oto-border bg-oto-surface p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label className="text-xs font-bold text-oto-muted" htmlFor="listing-description-mode">{t.length}</label>
      <select id="listing-description-mode" className="rounded border border-oto-border bg-white p-1 text-sm" value={mode} onChange={(event) => setMode(event.target.value as DescriptionMode)} disabled={busy}>
        <option value="concise">{t.concise}</option><option value="standard">{t.standard}</option><option value="detailed">{t.detailed}</option>
      </select>
    </div>
    <p className="mt-2 text-xs leading-5 text-oto-muted">{ready ? t.help : t.unavailable}</p>
    <Button className="mt-3" type="button" variant="secondary" onClick={() => void generate()} disabled={busy || !ready} isLoading={busy}>{busy ? t.generating : t.generate}</Button>
    {error ? <p role="alert" className="mt-2 text-xs font-bold text-oto-danger">{error}</p> : null}
    {preview ? <div className="mt-3 grid gap-2"><Textarea aria-label={t.previewLabel} value={preview} maxLength={4000} onChange={(event) => setPreview(event.target.value)} /><div className="flex flex-wrap gap-2"><Button type="button" onClick={() => { onApply(preview); setPreview(""); }}>{t.apply}</Button><Button type="button" variant="secondary" onClick={() => setPreview("")}>{t.discard}</Button></div></div> : null}
  </div>;
}
