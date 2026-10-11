import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedRequest } from "@/lib/messaging/conversation-api";
import { buyerRequestErrorMessage, buyerRequestResponseHeaders, isBuyerRequestCriteria, isPlainObject, rpcErrorStatus, validBuyerRequestTitle } from "@/lib/buyer-request/contract";

export const dynamic = "force-dynamic";

type BuyerRequestRow = { buyer_request_id: string; title: string | null; criteria_version: string; search_request: Record<string, unknown>; status: "active" | "archived"; created_at: string; updated_at: string };
const json = (body: object, status: number) => NextResponse.json(body, { status, headers: buyerRequestResponseHeaders });
const toBuyerRequest = (row: BuyerRequestRow) => ({ id: row.buyer_request_id, title: row.title, criteriaVersion: row.criteria_version, searchRequest: row.search_request, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at });

export async function GET(request: NextRequest) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return json({ error: buyerRequestErrorMessage(401) }, 401);
  const includeArchived = request.nextUrl.searchParams.get("includeArchived") === "true";
  if ([...request.nextUrl.searchParams.keys()].some((key) => key !== "includeArchived")) return json({ error: buyerRequestErrorMessage(422) }, 422);
  const { data, error } = await authenticated.supabase.schema("marketplace").rpc("list_own_buyer_requests", { p_include_archived: includeArchived });
  if (error) { const status = rpcErrorStatus(error.code); return json({ error: buyerRequestErrorMessage(status) }, status); }
  return json({ data: ((data ?? []) as BuyerRequestRow[]).map(toBuyerRequest) }, 200);
}

export async function POST(request: NextRequest) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return json({ error: buyerRequestErrorMessage(401) }, 401);
  const payload = await readJson(request);
  if (!payload || Object.keys(payload).some((key) => !["request", "title"].includes(key)) || !isBuyerRequestCriteria(payload.request) || ("title" in payload && !validBuyerRequestTitle(payload.title))) return json({ error: buyerRequestErrorMessage(422) }, 422);
  const { data, error } = await authenticated.supabase.schema("marketplace").rpc("create_own_buyer_request", { p_request: payload.request, p_title: payload.title ?? null });
  if (error) { const status = rpcErrorStatus(error.code); return json({ error: buyerRequestErrorMessage(status) }, status); }
  const row = Array.isArray(data) ? data[0] : null;
  return row ? json({ data: toBuyerRequest(row as BuyerRequestRow) }, 201) : json({ error: buyerRequestErrorMessage(500) }, 500);
}

async function readJson(request: NextRequest) { try { const payload: unknown = await request.json(); return isPlainObject(payload) ? payload : null; } catch { return null; } }
