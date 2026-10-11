import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/messaging/conversation-api";
import { buyerRequestErrorMessage, buyerRequestResponseHeaders, isBuyerRequestCriteria, isPlainObject, parseBuyerRequestId, rpcErrorStatus, validBuyerRequestTitle } from "@/lib/buyer-request/contract";

export const dynamic = "force-dynamic";
const json = (body: object, status: number) => NextResponse.json(body, { status, headers: buyerRequestResponseHeaders });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return json({ error: buyerRequestErrorMessage(401) }, 401);
  const id = parseBuyerRequestId((await params).id); const payload = await readJson(request);
  if (!id || !payload || Object.keys(payload).some((key) => !["request", "title"].includes(key)) || !isBuyerRequestCriteria(payload.request) || ("title" in payload && !validBuyerRequestTitle(payload.title))) return json({ error: buyerRequestErrorMessage(422) }, 422);
  const { data, error } = await authenticated.supabase.schema("marketplace").rpc("update_own_buyer_request", { p_buyer_request_id: id, p_request: payload.request, p_title: payload.title ?? null });
  if (error) { const status = rpcErrorStatus(error.code); return json({ error: buyerRequestErrorMessage(status) }, status); }
  const row = Array.isArray(data) ? data[0] : null;
  return row ? json({ data: { id: row.buyer_request_id, title: row.title, criteriaVersion: row.criteria_version, searchRequest: row.search_request, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at } }, 200) : json({ error: buyerRequestErrorMessage(500) }, 500);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return json({ error: buyerRequestErrorMessage(401) }, 401);
  const id = parseBuyerRequestId((await params).id);
  if (!id) return json({ error: buyerRequestErrorMessage(404) }, 404);
  const { error } = await authenticated.supabase.schema("marketplace").rpc("archive_own_buyer_request", { p_buyer_request_id: id });
  if (error) { const status = rpcErrorStatus(error.code); return json({ error: buyerRequestErrorMessage(status) }, status); }
  return new NextResponse(null, { status: 204, headers: buyerRequestResponseHeaders });
}

async function readJson(request: NextRequest) { try { const payload: unknown = await request.json(); return isPlainObject(payload) ? payload : null; } catch { return null; } }
