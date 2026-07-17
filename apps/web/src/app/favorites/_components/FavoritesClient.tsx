"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { HomeListing } from "@/lib/supabase/types";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { VehicleGrid } from "@/components/vehicle/VehicleGrid";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

const FAVORITE_LISTING_COLUMNS = [
  "listing_id",
  "vehicle_profile_id",
  "title",
  "price_amount",
  "currency",
  "city",
  "published_at",
  "make_name",
  "model_name",
  "year",
  "mileage_km",
  "fuel_type",
  "transmission",
  "cover_image_url",
  "media_count",
  "price_negotiable",
  "body_type",
  "condition",
  "seller_type",
  "drive_type",
  "color",
  "engine_volume_l",
  "damage_state",
  "owner_count",
  "quality_score",
  "seller_display_name",
  "video_count"
].join(",");

export function FavoritesClient() {
  const { locale, dictionary } = useI18n();
  const router = useRouter();
  const [listings, setListings] = useState<HomeListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!hasSupabaseEnv()) {
        setError(String(dictionary.errors.missingSupabaseEnv));
        setLoading(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace(`${localizePath("/login", locale)}?next=${encodeURIComponent(localizePath("/favorites", locale))}`);
        return;
      }

      const { data: favorites, error: favoriteError } = await supabase
        .schema("marketplace")
        .from("listing_favorites")
        .select("listing_id")
        .order("created_at", { ascending: false })
        .limit(60);

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

      const { data, error: listingError } = await supabase.from("ff_home_listings").select(FAVORITE_LISTING_COLUMNS).in("listing_id", ids);
      if (listingError) {
        setError(listingError.message);
      }
      setListings((data ?? []) as unknown as HomeListing[]);
      setLoading(false);
    }

    void load();
  }, [dictionary.errors.missingSupabaseEnv, locale, router]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (listings.length === 0) {
    return (
      <EmptyState
        title={String(dictionary.favorites.emptyTitle)}
        body={String(dictionary.favorites.emptyBody)}
        href={localizePath("/search", locale)}
        action={locale === "en" ? "Search listings" : "İlan ara"}
      />
    );
  }

  return <VehicleGrid listings={listings} locale={locale} />;
}
