"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

type AnalyticsRow = {
  dealer_id: string;
  metric: "total" | "funnel" | "source" | "manager";
  dimension: string;
  lead_count: number;
  open_follow_up_count: number;
  overdue_follow_up_count: number;
};

const labels: Record<string, string> = {
  new: "New", contacted: "Contacted", thinking: "Thinking", meeting: "Meeting", sold: "Sold", lost: "Lost",
  listing: "Listing", chat: "Chat", contact: "Protected contact", buyer_request: "Buyer request", dealer_post: "Dealer post", dealer_live: "Dealer live",
  unassigned: "Unassigned"
};

function label(value: string) { return labels[value] ?? value; }

export function DealerCrmAnalyticsClient() {
  const [rows, setRows] = useState<AnalyticsRow[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    if (!hasSupabaseEnv()) { setError(true); return; }
    const supabase = getSupabaseBrowserClient();
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) { setError(true); return; }
    const { data, error: rpcError } = await supabase.rpc("list_own_dealer_crm_analytics");
    if (rpcError || !Array.isArray(data)) { setError(true); return; }
    setRows(data as AnalyticsRow[]);
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (rows === null && !error) return <LoadingState label="Loading dealer CRM analytics…" />;
  if (error) return <div className="grid gap-3"><ErrorState message="Dealer CRM analytics are unavailable right now." /><Button onClick={() => void load()}>Try again</Button></div>;
  if (!rows?.length) return <EmptyState title="No dealer CRM access" body="This dashboard is available to a dealer owner or assigned dealer staff member." tone="profile" />;

  const dealerIds = Array.from(new Set(rows.map((row) => row.dealer_id)));
  return <div className="grid gap-5" aria-label="Dealer CRM analytics">
    {dealerIds.map((dealerId) => {
      const dealerRows = rows.filter((row) => row.dealer_id === dealerId);
      const total = dealerRows.find((row) => row.metric === "total");
      return <section key={dealerId} className="grid gap-4 rounded-oto border border-oto-border bg-white p-4 shadow-soft sm:p-5">
        <div><h2 className="text-lg font-black text-oto-text">Pipeline overview</h2><p className="mt-1 text-sm text-oto-muted">Your dealer team’s CRM activity.</p></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Metric label="Leads" value={total?.lead_count ?? 0} />
          <Metric label="Open follow-ups" value={total?.open_follow_up_count ?? 0} />
          <Metric label="Overdue" value={total?.overdue_follow_up_count ?? 0} />
          <Metric label="Funnel stages" value={dealerRows.filter((row) => row.metric === "funnel").length} />
        </div>
        <MetricGroup title="Funnel" rows={dealerRows.filter((row) => row.metric === "funnel")} />
        <MetricGroup title="Lead source" rows={dealerRows.filter((row) => row.metric === "source")} />
        <MetricGroup title="Manager" rows={dealerRows.filter((row) => row.metric === "manager")} />
      </section>;
    })}
  </div>;
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-md bg-oto-surface p-3"><p className="text-xs font-bold text-oto-muted">{label}</p><p className="mt-1 text-xl font-black text-oto-text">{value}</p></div>;
}

function MetricGroup({ title, rows }: { title: string; rows: AnalyticsRow[] }) {
  if (!rows.length) return null;
  return <section><h3 className="text-sm font-black text-oto-text">{title}</h3><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{rows.map((row) => <div key={`${row.metric}-${row.dimension}`} className="rounded-md border border-oto-border p-3"><p className="truncate text-sm font-bold text-oto-text" title={row.metric === "manager" && row.dimension !== "unassigned" ? "Assigned team member" : undefined}>{label(row.dimension)}</p><p className="mt-1 text-sm text-oto-muted">{row.lead_count} lead{row.lead_count === 1 ? "" : "s"}</p><p className="mt-1 text-xs font-semibold text-oto-muted">{row.open_follow_up_count} open · {row.overdue_follow_up_count} overdue</p></div>)}</div></section>;
}
