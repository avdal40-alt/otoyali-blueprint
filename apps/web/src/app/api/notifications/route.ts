import { NextRequest, NextResponse } from "next/server";
import { parseCursor, privateResponseHeaders, requireAuthenticatedRequest } from "@/lib/messaging/conversation-api";

export const dynamic = "force-dynamic";

function privateJson(body: object, status: number) {
  return NextResponse.json(body, { status, headers: privateResponseHeaders });
}

function rpcStatus(code: string | null | undefined) {
  return code === "OT401" ? 401 : code === "OT422" ? 422 : 500;
}

export async function GET(request: NextRequest) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return privateJson({ error: "Oturum gerekli." }, 401);
  const cursor = parseCursor(request.nextUrl.searchParams, 50);
  if (!cursor) return privateJson({ error: "Geçersiz bildirim sayfası." }, 422);
  const { data, error } = await authenticated.supabase.schema("marketplace").rpc("list_own_notifications", {
    p_limit: cursor.limit,
    p_before_created_at: cursor.beforeAt,
    p_before_id: cursor.beforeId
  });
  if (error) return privateJson({ error: rpcStatus(error.code) === 422 ? "Geçersiz bildirim sayfası." : "Bildirimler yüklenemedi." }, rpcStatus(error.code));
  const rows = (data ?? []) as Array<{ notification_id: string; notification_type: string; saved_search_id: string | null; listing_id: string | null; created_at: string; read_at: string | null }>;
  const last = rows.at(-1);
  return privateJson({ data: rows.map((row) => ({ id: row.notification_id, type: row.notification_type, savedSearchId: row.saved_search_id, listingId: row.listing_id, createdAt: row.created_at, readAt: row.read_at })), nextCursor: last ? { beforeAt: last.created_at, beforeId: last.notification_id } : null }, 200);
}
