import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/messaging/conversation-api";
import { isPlainObject, isSavedSearchRequest, rpcErrorMessage, rpcErrorStatus, savedSearchResponseHeaders } from "@/lib/saved-search/contract";

export const dynamic = "force-dynamic";

type SavedSearchRow = {
  saved_search_id: string;
  title: string | null;
  criteria_version: string | null;
  search_request: Record<string, unknown> | null;
  legacy_query_params?: Record<string, unknown> | null;
  alert_enabled: boolean;
  created_at: string;
  updated_at: string;
};

function privateJson(body: object, status: number) {
  return NextResponse.json(body, { status, headers: savedSearchResponseHeaders });
}

function toSavedSearch(row: SavedSearchRow, includeLegacy = false) {
  return {
    id: row.saved_search_id,
    title: row.title,
    criteriaVersion: row.criteria_version,
    searchRequest: row.search_request,
    ...(includeLegacy ? { legacyQueryParams: row.legacy_query_params ?? null } : {}),
    alertEnabled: row.alert_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function GET(request: NextRequest) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return privateJson({ error: "Oturum gerekli." }, 401);
  const { data, error } = await authenticated.supabase.schema("marketplace").rpc("list_own_saved_searches");
  if (error) {
    const status = rpcErrorStatus(error.code);
    return privateJson({ error: rpcErrorMessage(status) }, status);
  }
  return privateJson({ data: ((data ?? []) as SavedSearchRow[]).map((row) => toSavedSearch(row, true)) }, 200);
}

export async function POST(request: NextRequest) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return privateJson({ error: "Oturum gerekli." }, 401);
  const payload = await readJson(request);
  if (!payload || Object.keys(payload).some((key) => !["request", "title", "alertEnabled"].includes(key)) || !isSavedSearchRequest(payload.request)) {
    return privateJson({ error: "Geçersiz kayıtlı arama." }, 422);
  }
  const title = typeof payload.title === "string" && Array.from(payload.title.trim()).length <= 120 ? payload.title : null;
  if (("title" in payload && title === null) || ("alertEnabled" in payload && typeof payload.alertEnabled !== "boolean")) return privateJson({ error: "Geçersiz kayıtlı arama." }, 422);
  const { data, error } = await authenticated.supabase.schema("marketplace").rpc("create_saved_search", {
    p_request: payload.request,
    p_title: title,
    p_alert_enabled: payload.alertEnabled ?? false
  });
  if (error) {
    const status = rpcErrorStatus(error.code);
    return privateJson({ error: rpcErrorMessage(status) }, status);
  }
  const row = Array.isArray(data) ? data[0] : null;
  return row ? privateJson({ data: toSavedSearch(row as SavedSearchRow) }, 201) : privateJson({ error: rpcErrorMessage(500) }, 500);
}

async function readJson(request: NextRequest) {
  try {
    const payload: unknown = await request.json();
    return isPlainObject(payload) ? payload : null;
  } catch {
    return null;
  }
}
