"use client";

import { useState } from "react";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

export function DealerFollowButton({ dealerId, initialFollowing, initialCount }: { dealerId: string; initialFollowing: boolean; initialCount: number }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function toggle() {
    if (!hasSupabaseEnv() || busy) return;
    setBusy(true); setError(false);
    const { data, error: rpcError } = await getSupabaseBrowserClient().rpc("toggle_dealer_follow", { p_dealer_id: dealerId });
    if (rpcError || !data?.[0]) setError(true);
    else { setFollowing(data[0].is_following); setCount(data[0].follower_count); }
    setBusy(false);
  }

  return <div className="flex items-center gap-3"><button type="button" onClick={toggle} disabled={busy} className="rounded-oto border border-oto-orange px-4 py-2 text-sm font-bold text-oto-orange disabled:opacity-50">{following ? "Takibi bırak" : "Galeriyi takip et"}</button><span className="text-sm text-oto-muted" aria-live="polite">{count} takipçi{error ? " · Tekrar deneyin" : ""}</span></div>;
}
