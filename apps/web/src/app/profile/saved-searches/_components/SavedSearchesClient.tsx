"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

type SavedSearch = { id: string; title: string | null; criteriaVersion: string | null; searchRequest: Record<string, unknown> | null; alertEnabled: boolean };

export function SavedSearchesClient() {
  const { locale, dictionary } = useI18n();
  const copy = dictionary.notifications;
  const [rows, setRows] = useState<SavedSearch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loginRequired, setLoginRequired] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const request = useCallback(async (path: string, init?: RequestInit) => {
    if (!hasSupabaseEnv()) throw new Error("auth");
    const { data } = await getSupabaseBrowserClient().auth.getSession();
    if (!data.session) throw new Error("auth");
    const response = await fetch(path, { cache: "no-store", ...init, headers: { Authorization: `Bearer ${data.session.access_token}`, ...(init?.headers ?? {}) } });
    const payload = await response.json().catch(() => null) as { data?: unknown } | null;
    if (!response.ok) throw new Error("request");
    return payload;
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const payload = await request("/api/saved-searches") as { data?: SavedSearch[] };
      if (!Array.isArray(payload?.data)) throw new Error("request");
      setRows(payload.data);
    } catch (cause) { setLoginRequired(cause instanceof Error && cause.message === "auth"); setError(String(copy.savedSearchesUnavailable)); setRows([]); }
  }, [copy.savedSearchesUnavailable, request]);

  useEffect(() => { void load(); }, [load]);

  async function updateAlerts(row: SavedSearch, alertEnabled: boolean) {
    if (row.criteriaVersion !== "v1" || pendingId) return;
    setPendingId(row.id); setError(null);
    try {
      await request(`/api/saved-searches/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: row.title ?? "", alertEnabled }) });
      setRows((current) => current?.map((item) => item.id === row.id ? { ...item, alertEnabled } : item) ?? current);
    } catch { setError(String(copy.actionFailed)); }
    finally { setPendingId(null); }
  }

  async function remove(row: SavedSearch) {
    if (pendingId) return;
    setPendingId(row.id); setError(null);
    try {
      await request(`/api/saved-searches/${row.id}`, { method: "DELETE" });
      setRows((current) => current?.filter((item) => item.id !== row.id) ?? current);
    } catch { setError(String(copy.actionFailed)); }
    finally { setPendingId(null); }
  }

  if (rows === null && !error) return <LoadingState label={String(copy.loading)} />;
  if (loginRequired) return <EmptyState title={String(dictionary.profile.loginRequiredTitle)} body={String(dictionary.profile.loginRequiredBody)} href={`${localizePath("/login", locale)}?next=${encodeURIComponent(localizePath("/profile/saved-searches", locale))}`} action={String(dictionary.auth.verifyCode)} tone="profile" />;
  if (error && !rows?.length) return <div className="grid gap-3"><ErrorState message={error} /><Button onClick={() => void load()}>{String(copy.retry)}</Button></div>;
  if (!rows?.length) return <EmptyState title={String(copy.noSavedSearches)} body={String(copy.noSavedSearchesBody)} tone="profile" />;

  return <section className="mx-auto max-w-3xl"><h1 className="text-2xl font-black text-oto-text">{String(copy.savedSearches)}</h1><p className="mt-1 text-sm text-oto-muted">{String(copy.savedSearchesHint)}</p>{error ? <div className="mt-4"><ErrorState message={error} /></div> : null}<div className="mt-5 grid gap-3">{rows.map((row) => {
    const canonical = row.criteriaVersion === "v1" && row.searchRequest;
    const title = row.title?.trim() || (canonical ? String(copy.savedSearches) : String(copy.legacy));
    return <article key={row.id} className="rounded-oto border border-oto-border bg-white p-4 shadow-soft"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-black text-oto-text">{title}</h2><p className="mt-1 text-sm text-oto-muted">{canonical ? (row.alertEnabled ? String(copy.alertsEnabled) : String(copy.alertsDisabled)) : String(copy.alertsUnavailable)}</p></div><Button variant="danger" size="sm" onClick={() => void remove(row)} disabled={pendingId === row.id}>{pendingId === row.id ? String(copy.deleting) : String(copy.delete)}</Button></div>{canonical ? <label className="mt-4 flex items-center justify-between gap-3 rounded-md bg-oto-surface p-3 text-sm font-bold text-oto-text"><span>{String(copy.alertToggle)}</span><input type="checkbox" checked={row.alertEnabled} onChange={(event) => void updateAlerts(row, event.target.checked)} disabled={pendingId === row.id} aria-label={`${String(copy.alertToggle)}: ${title}`} /></label> : null}</article>;
  })}</div></section>;
}
