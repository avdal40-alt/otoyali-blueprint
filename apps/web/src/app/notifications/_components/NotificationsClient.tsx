"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

type NotificationRow = { id: string; type: "saved_search_match"; listingId: string | null; createdAt: string; readAt: string | null };
type Cursor = { beforeAt: string; beforeId: string };

export function NotificationsClient() {
  const { locale, dictionary } = useI18n();
  const copy = dictionary.notifications;
  const [rows, setRows] = useState<NotificationRow[] | null>(null);
  const [nextCursor, setNextCursor] = useState<Cursor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [loginRequired, setLoginRequired] = useState(false);

  const request = useCallback(async (path: string, init?: RequestInit) => {
    if (!hasSupabaseEnv()) throw new Error("auth");
    const { data } = await getSupabaseBrowserClient().auth.getSession();
    if (!data.session) throw new Error("auth");
    const response = await fetch(path, { cache: "no-store", ...init, headers: { Authorization: `Bearer ${data.session.access_token}`, ...(init?.headers ?? {}) } });
    const payload = await response.json().catch(() => null) as { data?: unknown } | null;
    if (!response.ok) throw new Error("request");
    return payload;
  }, []);

  const load = useCallback(async (cursor?: Cursor, append = false) => {
    setError(null);
    if (append) setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (cursor) { params.set("beforeAt", cursor.beforeAt); params.set("beforeId", cursor.beforeId); }
      const data = await request(`/api/notifications?${params}`) as { data?: NotificationRow[]; nextCursor?: Cursor | null };
      if (!Array.isArray(data?.data)) throw new Error("request");
      setRows((current) => append ? [...(current ?? []), ...data.data!] : data.data!);
      setNextCursor(data.nextCursor ?? null);
    } catch (cause) { setLoginRequired(cause instanceof Error && cause.message === "auth"); setError(String(copy.unavailable)); if (!append) setRows([]); }
    finally { setLoadingMore(false); }
  }, [copy.unavailable, request]);

  useEffect(() => { void load(); }, [load]);

  async function markRead(id: string) {
    if (pendingId || rows?.find((row) => row.id === id)?.readAt) return;
    setPendingId(id);
    try {
      await request(`/api/notifications/${id}/read`, { method: "POST" });
      setRows((current) => current?.map((row) => row.id === id ? { ...row, readAt: new Date().toISOString() } : row) ?? current);
    } catch { setError(String(copy.actionFailed)); }
    finally { setPendingId(null); }
  }

  async function markAll() {
    setMarkingAll(true); setError(null);
    try {
      await request("/api/notifications/read-all", { method: "POST" });
      setRows((current) => current?.map((row) => ({ ...row, readAt: row.readAt ?? new Date().toISOString() })) ?? current);
    } catch { setError(String(copy.actionFailed)); }
    finally { setMarkingAll(false); }
  }

  if (rows === null && !error) return <LoadingState label={String(copy.loading)} />;
  if (loginRequired) return <EmptyState title={String(dictionary.profile.loginRequiredTitle)} body={String(dictionary.profile.loginRequiredBody)} href={`${localizePath("/login", locale)}?next=${encodeURIComponent(localizePath("/notifications", locale))}`} action={String(dictionary.auth.verifyCode)} tone="profile" />;
  if (error && !rows?.length) return <div className="grid gap-3"><ErrorState message={error} /><Button onClick={() => void load()}>{String(copy.retry)}</Button></div>;
  if (!rows?.length) return <EmptyState title={String(copy.emptyTitle)} body={String(copy.emptyBody)} tone="profile" />;

  const unread = rows.some((row) => !row.readAt);
  return <section className="mx-auto max-w-3xl">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-black text-oto-text">{String(copy.title)}</h1><p className="mt-1 text-sm text-oto-muted">{String(copy.account)}</p></div>{unread ? <Button variant="secondary" size="sm" onClick={() => void markAll()} disabled={markingAll}>{markingAll ? String(copy.marking) : String(copy.markAll)}</Button> : null}</div>
    {error ? <div className="mt-4"><ErrorState message={error} /></div> : null}
    <div className="mt-5 grid gap-3">{rows.map((row) => <article key={row.id} className={`rounded-oto border p-4 shadow-soft ${row.readAt ? "border-oto-border bg-white" : "border-oto-blue/30 bg-oto-blue/5"}`}>
      <div className="flex items-start justify-between gap-3"><div><p className="font-black text-oto-text">{String(copy.newMatch)}</p><p className="mt-1 text-sm text-oto-muted">{new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.createdAt))}</p></div>{!row.readAt ? <span className="rounded-full bg-oto-blue px-2 py-1 text-xs font-bold text-white">{String(copy.unread)}</span> : null}</div>
      {row.listingId ? <Link href={localizePath(`/listing/${row.listingId}`, locale)} onClick={() => void markRead(row.id)} className="mt-4 inline-flex rounded-button bg-oto-blue px-4 py-2 text-sm font-bold text-white hover:bg-oto-blue/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-oto-blue/30" aria-busy={pendingId === row.id || undefined}>{String(copy.openListing)}</Link> : null}
    </article>)}</div>
    {nextCursor ? <div className="mt-5"><Button variant="secondary" onClick={() => void load(nextCursor, true)} disabled={loadingMore}>{loadingMore ? String(copy.loading) : String(copy.loadMore)}</Button></div> : null}
  </section>;
}
