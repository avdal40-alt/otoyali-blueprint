"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

export function StartConversationButton({ listingId, sellerId }: { listingId: string; sellerId?: string | null }) {
  const { locale, dictionary } = useI18n(); const router = useRouter(); const pathname = usePathname();
  const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  async function start() {
    setError(null); if (!hasSupabaseEnv()) return setError(String(dictionary.messages.unavailable));
    const { data } = await getSupabaseBrowserClient().auth.getSession();
    if (!data.session) { router.push(`${localizePath("/login", locale)}?next=${encodeURIComponent(localizePath(pathname, locale))}`); return; }
    if (sellerId && data.session.user.id === sellerId) return setError(String(dictionary.messages.ownListing));
    setLoading(true);
    try {
      const response = await fetch("/api/conversations", { method: "POST", cache: "no-store", headers: { "content-type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ listingId }) });
      const result = await response.json() as { data?: { conversationId?: string } };
      if (!response.ok || !result.data?.conversationId) throw new Error("unavailable");
      router.push(localizePath(`/profile/messages/${result.data.conversationId}`, locale));
    } catch { setError(String(dictionary.messages.unavailable)); } finally { setLoading(false); }
  }
  return <div><Button type="button" variant="secondary" onClick={start} disabled={loading} aria-describedby={error ? "conversation-error" : undefined}>{loading ? String(dictionary.common.loading) : String(dictionary.messages.start)}</Button>{error ? <p id="conversation-error" role="alert" className="mt-2 text-sm text-oto-danger">{error}</p> : null}</div>;
}
