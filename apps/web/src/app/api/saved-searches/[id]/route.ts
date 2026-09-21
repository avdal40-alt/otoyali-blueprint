import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/messaging/conversation-api";
import { isPlainObject, parseSavedSearchId, rpcErrorMessage, rpcErrorStatus, savedSearchResponseHeaders } from "@/lib/saved-search/contract";

export const dynamic = "force-dynamic";

function privateJson(body: object, status: number) {
  return NextResponse.json(body, { status, headers: savedSearchResponseHeaders });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return privateJson({ error: "Oturum gerekli." }, 401);
  const id = parseSavedSearchId((await params).id);
  const payload = await readJson(request);
  if (!id || !payload || Object.keys(payload).some((key) => !["title", "alertEnabled"].includes(key)) || typeof payload.title !== "string" || Array.from(payload.title.trim()).length > 120 || typeof payload.alertEnabled !== "boolean") {
    return privateJson({ error: "Geçersiz kayıtlı arama." }, 422);
  }
  const { data, error } = await authenticated.supabase.schema("marketplace").rpc("update_own_saved_search_metadata", {
    p_saved_search_id: id,
    p_title: payload.title,
    p_alert_enabled: payload.alertEnabled
  });
  if (error) {
    const status = rpcErrorStatus(error.code);
    return privateJson({ error: rpcErrorMessage(status) }, status);
  }
  const row = Array.isArray(data) ? data[0] : null;
  return row ? privateJson({ data: { id: row.saved_search_id, title: row.title, criteriaVersion: row.criteria_version, searchRequest: row.search_request, alertEnabled: row.alert_enabled, createdAt: row.created_at, updatedAt: row.updated_at } }, 200) : privateJson({ error: rpcErrorMessage(500) }, 500);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return privateJson({ error: "Oturum gerekli." }, 401);
  const id = parseSavedSearchId((await params).id);
  if (!id) return privateJson({ error: "Kayıtlı arama kullanılamıyor." }, 404);
  const { error } = await authenticated.supabase.schema("marketplace").rpc("delete_own_saved_search", { p_saved_search_id: id });
  if (error) {
    const status = rpcErrorStatus(error.code);
    return privateJson({ error: rpcErrorMessage(status) }, status);
  }
  return new NextResponse(null, { status: 204, headers: savedSearchResponseHeaders });
}

async function readJson(request: NextRequest) {
  try {
    const payload: unknown = await request.json();
    return isPlainObject(payload) ? payload : null;
  } catch {
    return null;
  }
}
