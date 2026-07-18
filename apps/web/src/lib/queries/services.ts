import { getSupabaseServerClient, hasSupabaseEnv } from "@/lib/supabase/server";
import type {
  ServicePublicCategory,
  ServicePublicOffering,
  ServicePublicProvider,
  ServicePublicProviderDetails
} from "@/lib/supabase/types";
import type { QueryResult } from "./listings";

const SERVICE_CATEGORY_COLUMNS = [
  "category_id",
  "category_key",
  "seo_slug",
  "icon_name",
  "supported_verticals",
  "availability_status",
  "booking_readiness",
  "emergency_relevant",
  "sort_order"
].join(",");

const SERVICE_PROVIDER_COLUMNS = [
  "provider_id",
  "provider_slug",
  "business_name",
  "public_summary",
  "website_url",
  "verification_status",
  "primary_city",
  "primary_district",
  "branch_count",
  "service_category_keys",
  "supported_verticals",
  "published_at"
].join(",");

const SERVICE_PROVIDER_DETAILS_COLUMNS = [
  "provider_id",
  "provider_slug",
  "business_name",
  "public_summary",
  "website_url",
  "verification_status",
  "provider_published_at",
  "branch_id",
  "branch_slug",
  "branch_name",
  "branch_description",
  "city",
  "district",
  "public_address",
  "branch_status",
  "branch_published_at"
].join(",");

const SERVICE_OFFERING_COLUMNS = [
  "offering_id",
  "provider_id",
  "provider_slug",
  "branch_id",
  "branch_slug",
  "category_id",
  "category_key",
  "display_name",
  "description",
  "pricing_mode",
  "price_min_amount",
  "price_max_amount",
  "currency",
  "duration_min_minutes",
  "duration_max_minutes",
  "booking_mode",
  "supported_verticals"
].join(",");

export type ServiceProviderFilters = {
  category?: string | null;
  city?: string | null;
  vertical?: string | null;
  limit?: number;
};

export async function getServiceCategories(): Promise<QueryResult<ServicePublicCategory[]>> {
  const queryName = "service_public_categories";
  if (!hasSupabaseEnv()) {
    return { data: [], error: "Supabase environment variables are missing.", count: 0, queryName };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("service_public_categories")
    .select(SERVICE_CATEGORY_COLUMNS)
    .order("sort_order", { ascending: true });

  return {
    data: (data ?? []) as unknown as ServicePublicCategory[],
    error: error?.message ?? null,
    count: data?.length ?? 0,
    queryName
  };
}

export async function getServiceProviders(filters: ServiceProviderFilters = {}): Promise<QueryResult<ServicePublicProvider[]>> {
  const queryName = "service_public_providers";
  if (!hasSupabaseEnv()) {
    return { data: [], error: "Supabase environment variables are missing.", count: 0, queryName };
  }

  const supabase = getSupabaseServerClient();
  let query = supabase
    .from("service_public_providers")
    .select(SERVICE_PROVIDER_COLUMNS)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(filters.limit ?? 24);

  if (filters.category) {
    query = query.contains("service_category_keys", [filters.category]);
  }

  if (filters.vertical) {
    query = query.contains("supported_verticals", [filters.vertical]);
  }

  if (filters.city) {
    query = query.eq("primary_city", filters.city);
  }

  const { data, error } = await query;

  return {
    data: (data ?? []) as unknown as ServicePublicProvider[],
    error: error?.message ?? null,
    count: data?.length ?? 0,
    queryName
  };
}

export async function getServiceProviderBySlug(slug: string): Promise<
  QueryResult<{
    provider: ServicePublicProviderDetails | null;
    branches: ServicePublicProviderDetails[];
    offerings: ServicePublicOffering[];
  }>
> {
  const queryName = "service_public_provider_details";
  if (!hasSupabaseEnv()) {
    return { data: { provider: null, branches: [], offerings: [] }, error: "Supabase environment variables are missing.", count: 0, queryName };
  }

  const supabase = getSupabaseServerClient();
  const [detailsResult, offeringsResult] = await Promise.all([
    supabase
      .from("service_public_provider_details")
      .select(SERVICE_PROVIDER_DETAILS_COLUMNS)
      .eq("provider_slug", slug)
      .order("branch_published_at", { ascending: false, nullsFirst: false }),
    supabase
      .from("service_public_offerings")
      .select(SERVICE_OFFERING_COLUMNS)
      .eq("provider_slug", slug)
      .order("display_name", { ascending: true })
  ]);

  const branches = (detailsResult.data ?? []) as unknown as ServicePublicProviderDetails[];
  const offerings = (offeringsResult.data ?? []) as unknown as ServicePublicOffering[];
  const error = detailsResult.error?.message ?? offeringsResult.error?.message ?? null;

  return {
    data: {
      provider: branches[0] ?? null,
      branches,
      offerings
    },
    error,
    count: branches.length,
    queryName
  };
}
