"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

type ContactSellerButtonProps = {
  listingId: string;
  sellerId?: string | null;
};

type ContactResponse = { data?: { phone?: unknown } };

export function ContactSellerButton({ listingId, sellerId }: ContactSellerButtonProps) {
  const { locale, dictionary } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [phone, setPhone] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loginPath = `${localizePath("/login", locale)}?next=${encodeURIComponent(localizePath(pathname, locale))}`;

  async function contact() {
    setMessage(null);
    if (!hasSupabaseEnv()) {
      setMessage(String(dictionary.errors.missingSupabaseEnv));
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push(loginPath);
      return;
    }

    if (sellerId && data.session.user.id === sellerId) {
      setMessage(String(dictionary.listing.ownListingContact));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/listing/contact", {
        method: "POST",
        cache: "no-store",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${data.session.access_token}`
        },
        body: JSON.stringify({ listingId })
      });
      const payload = (await response.json().catch(() => null)) as ContactResponse | null;

      if (response.status === 401) {
        router.push(loginPath);
        return;
      }

      const returnedPhone = payload?.data?.phone;
      if (!response.ok || typeof returnedPhone !== "string" || !/^\+[1-9][0-9]{1,14}$/.test(returnedPhone)) {
        setMessage(String(dictionary.listing.contactUnavailable));
        return;
      }

      setPhone(returnedPhone);
    } catch {
      setMessage(String(dictionary.listing.contactUnavailable));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      {phone ? (
        <a href={`tel:${phone}`} className="rounded-md bg-oto-orange px-4 py-3 text-center text-sm font-black text-white transition hover:brightness-95">
          {phone}
        </a>
      ) : (
        <Button onClick={contact} variant="orange" className="w-full" disabled={loading}>
          {loading ? String(dictionary.common.loading) : String(dictionary.listing.contactSeller)}
        </Button>
      )}
      {message ? <p className="text-sm font-semibold text-oto-muted" role="status">{message}</p> : null}
    </div>
  );
}
