import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SearchService, SearchV1Request, SearchV1Response } from "./search-contract";

export type { PublicSearchItem, SearchCursor, SearchService, SearchV1Request, SearchV1Response } from "./search-contract";

/**
 * The sole application adapter for the public PostgreSQL Search v1 contract.
 * A measured future secondary index may implement SearchService, but it must
 * preserve this request/response shape and PostgreSQL remains authoritative.
 */
export function createPostgresSearchService(supabase: SupabaseClient): SearchService {
  return {
    async search(request) {
      const { data, error } = await supabase.schema("marketplace").rpc("search_listings_v1", { p_request: request });
      return { data: isSearchResponse(data) ? data : null, error: error?.message ?? null };
    }
  };
}

function isSearchResponse(value: unknown): value is SearchV1Response {
  if (!value || typeof value !== "object") return false;
  const response = value as { version?: unknown; items?: unknown; next_cursor?: unknown };
  return response.version === "v1" && Array.isArray(response.items) && (response.next_cursor === null || typeof response.next_cursor === "object");
}
