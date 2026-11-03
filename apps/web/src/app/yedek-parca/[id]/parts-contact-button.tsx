"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function PartsContactButton({ listingId }: { listingId: string }) {
  const [message, setMessage] = useState<string | null>(null);
  async function reveal() {
    const { data } = await getSupabaseBrowserClient().auth.getSession();
    const token = data.session?.access_token;
    if (!token) { setMessage("Войдите, чтобы увидеть контакт продавца."); return; }
    const response = await fetch(`/api/parts-listings/${listingId}/contact`, { method: "POST", headers: { authorization: `Bearer ${token}` } });
    const payload = await response.json().catch(() => null) as { data?: { phone?: string }; error?: string } | null;
    setMessage(payload?.data?.phone ?? payload?.error ?? "Контакт продавца сейчас недоступен.");
  }
  return <div className="mt-6"><button type="button" onClick={() => void reveal()} className="min-h-11 rounded-oto bg-oto-orange px-5 text-sm font-black text-white">Показать контакт продавца</button>{message ? <p className="mt-3 text-sm font-bold text-oto-muted">{message}</p> : null}</div>;
}
