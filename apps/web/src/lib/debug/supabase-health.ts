import { getSupabaseEnvStatus, getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";

export type SupabaseHealthCheck = {
  queryName: string;
  success: boolean;
  rowCount: number;
  errorMessage: string | null;
};

export type SupabaseHealthReport = {
  env: ReturnType<typeof getSupabaseEnvStatus>;
  checks: SupabaseHealthCheck[];
  sampleHomeListings: Array<{
    listing_id: string;
    title: string | null;
    price_amount: number | null;
    currency: string | null;
    city: string | null;
    cover_image_url: string | null;
  }>;
};

async function runCountQuery(queryName: string): Promise<SupabaseHealthCheck> {
  if (!hasSupabaseEnv()) {
    return {
      queryName,
      success: false,
      rowCount: 0,
      errorMessage: "Supabase environment variables are missing."
    };
  }

  const supabase = getSupabaseServerClient();
  const { count, error } = await supabase.from(queryName).select("*", { count: "exact", head: true });

  return {
    queryName,
    success: !error,
    rowCount: count ?? 0,
    errorMessage: error?.message ?? null
  };
}

export async function getSupabaseHealthReport(): Promise<SupabaseHealthReport> {
  const env = getSupabaseEnvStatus();
  const queryNames = ["ff_makes", "ff_home_listings", "ff_listing_details", "ff_listing_media"];
  const checks = await Promise.all(queryNames.map((queryName) => runCountQuery(queryName)));

  let sampleHomeListings: SupabaseHealthReport["sampleHomeListings"] = [];

  if (hasSupabaseEnv()) {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase
      .from("ff_home_listings")
      .select("listing_id,title,price_amount,currency,city,cover_image_url")
      .limit(3);

    sampleHomeListings = (data ?? []).map((row) => ({
      listing_id: String(row.listing_id ?? ""),
      title: row.title ?? null,
      price_amount: row.price_amount ?? null,
      currency: row.currency ?? null,
      city: row.city ?? null,
      cover_image_url: row.cover_image_url ?? null
    }));
  }

  return {
    env,
    checks,
    sampleHomeListings
  };
}
