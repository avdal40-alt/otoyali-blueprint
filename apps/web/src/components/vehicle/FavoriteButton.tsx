"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

export function FavoriteButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id ?? null;
      setUserId(id);
      if (!id) {
        return;
      }
      const { data: favorite } = await supabase
        .schema("marketplace")
        .from("listing_favorites")
        .select("id")
        .eq("listing_id", listingId)
        .maybeSingle();
      setActive(Boolean(favorite));
    });
  }, [listingId]);

  async function toggleFavorite() {
    if (!hasSupabaseEnv()) {
      alert("Supabase ortam değişkenleri eksik.");
      return;
    }

    if (!userId) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setBusy(true);
    const supabase = getSupabaseBrowserClient();

    if (active) {
      await supabase.schema("marketplace").from("listing_favorites").delete().eq("listing_id", listingId);
      setActive(false);
    } else {
      const { error } = await supabase.schema("marketplace").from("listing_favorites").insert({
        user_id: userId,
        listing_id: listingId
      });
      if (!error) {
        setActive(true);
      }
    }

    setBusy(false);
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void toggleFavorite();
      }}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-oto-border bg-white text-oto-text transition hover:bg-oto-surface disabled:opacity-50"
      aria-label="Favori"
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} aria-hidden="true">
        <path
          d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
