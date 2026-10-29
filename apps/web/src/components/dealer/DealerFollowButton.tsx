"use client";

import { useState } from "react";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { useI18n } from "@/i18n/client";

function getCopy(locale: string) {
  const copies = {
    ru: { follow: "Подписаться на дилера", unfollow: "Отписаться", followers: "подписчиков", retry: "Попробуйте ещё раз" },
    kk: { follow: "Дилерге жазылу", unfollow: "Жазылудан бас тарту", followers: "жазылушы", retry: "Қайталап көріңіз" },
    en: { follow: "Follow dealer", unfollow: "Unfollow", followers: "followers", retry: "Try again" },
    "zh-CN": { follow: "关注经销商", unfollow: "取消关注", followers: "位关注者", retry: "请重试" }
  } as const;
  return locale === "kk" || locale === "en" || locale === "zh-CN" ? copies[locale] : copies.ru;
}

export function DealerFollowButton({ dealerId, initialFollowing, initialCount }: { dealerId: string; initialFollowing: boolean; initialCount: number }) {
  const { locale } = useI18n();
  const copy = getCopy(locale);
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

  return <div className="flex items-center gap-3"><button type="button" onClick={toggle} disabled={busy} className="rounded-oto border border-oto-orange px-4 py-2 text-sm font-bold text-oto-orange disabled:opacity-50">{following ? copy.unfollow : copy.follow}</button><span className="text-sm text-oto-muted" aria-live="polite">{count} {copy.followers}{error ? ` · ${copy.retry}` : ""}</span></div>;
}
