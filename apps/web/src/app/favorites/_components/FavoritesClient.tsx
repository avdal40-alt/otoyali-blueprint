"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { HomeListing } from "@/lib/supabase/types";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { VehicleGrid } from "@/components/vehicle/VehicleGrid";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";

export function FavoritesClient() {
  const router = useRouter();
  const [listings, setListings] = useState<HomeListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!hasSupabaseEnv()) {
        setError("Supabase ortam degiskenleri eksik.");
        setLoading(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login?next=/favorites");
        return;
      }

      const { data: favorites, error: favoriteError } = await supabase
        .schema("marketplace")
        .from("listing_favorites")
        .select("listing_id")
        .order("created_at", { ascending: false });

      if (favoriteError) {
        setError(favoriteError.message);
        setLoading(false);
        return;
      }

      const ids = (favorites ?? []).map((item) => item.listing_id);
      if (ids.length === 0) {
        setLoading(false);
        return;
      }

      const { data, error: listingError } = await supabase.from("ff_home_listings").select("*").in("listing_id", ids);
      if (listingError) {
        setError(listingError.message);
      }
      setListings((data ?? []) as HomeListing[]);
      setLoading(false);
    }

    void load();
  }, [router]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (listings.length === 0) return <EmptyState title="Favori yok" body="Begendiginiz ilanlari kaydederek daha sonra hizlica geri donebilirsiniz." href="/search" action="Ilan ara" />;

  return <VehicleGrid listings={listings} />;
}
