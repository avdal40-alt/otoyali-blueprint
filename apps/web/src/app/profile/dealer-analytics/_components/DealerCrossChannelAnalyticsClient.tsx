"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

type AnalyticsRow = { dealer_id: string; channel: "listing" | "post" | "live" | "lead"; metric: string; event_count: number };
const channelTitles: Record<AnalyticsRow["channel"], string> = { listing: "Listings", post: "Dealer Social", live: "Dealer Live", lead: "CRM leads" };

export function DealerCrossChannelAnalyticsClient() {
  const [rows, setRows] = useState<AnalyticsRow[] | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(async () => {
    setError(false);
    if (!hasSupabaseEnv()) { setError(true); return; }
    const supabase = getSupabaseBrowserClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setError(true); return; }
    const { data, error: rpcError } = await supabase.rpc("list_own_dealer_cross_channel_analytics");
    if (rpcError || !Array.isArray(data)) { setError(true); return; }
    setRows(data as AnalyticsRow[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  if (rows === null && !error) return <LoadingState label="Loading dealer analytics…" />;
  if (error) return <div className="grid gap-3"><ErrorState message="Dealer analytics are unavailable right now." /><Button onClick={() => void load()}>Try again</Button></div>;
  if (!rows?.length) return <EmptyState title="No dealer analytics access" body="This dashboard is available to a dealer owner or assigned dealer staff member." tone="profile" />;
  const dealerIds = Array.from(new Set(rows.map((row) => row.dealer_id)));
  return <div className="grid gap-5" aria-label="Dealer cross-channel analytics">{dealerIds.map((dealerId) => <section key={dealerId} className="grid gap-4 rounded-oto border border-oto-border bg-white p-4 shadow-soft sm:p-5"><div><h2 className="text-lg font-black text-oto-text">Performance overview</h2><p className="mt-1 text-sm text-oto-muted">Aggregate activity across the dealer team’s marketplace channels.</p></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(["listing", "post", "live", "lead"] as const).map((channel) => <ChannelCard key={channel} title={channelTitles[channel]} rows={rows.filter((row) => row.dealer_id === dealerId && row.channel === channel)} />)}</div></section>)}</div>;
}

function ChannelCard({ title, rows }: { title: string; rows: AnalyticsRow[] }) {
  return <section className="rounded-md bg-oto-surface p-3"><h3 className="text-sm font-black text-oto-text">{title}</h3><dl className="mt-2 grid gap-1">{rows.map((row) => <div key={row.metric} className="flex justify-between gap-2 text-sm"><dt className="truncate text-oto-muted">{metricLabel(row.metric)}</dt><dd className="font-black text-oto-text">{row.event_count}</dd></div>)}</dl></section>;
}
function metricLabel(metric: string) { return metric.replace(/^source:/, "Source: ").replace(/^funnel:/, "Stage: ").replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
