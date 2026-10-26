import { NextRequest, NextResponse } from "next/server";
import { parseCursor, privateResponseHeaders, publicRpcErrorStatus, rateLimit, requireAuthenticatedRequest } from "@/lib/messaging/conversation-api";

export const dynamic = "force-dynamic";

function privateJson(body: object, status: number, retryAfter?: number) {
  return NextResponse.json(body, { status, headers: retryAfter ? { ...privateResponseHeaders, "Retry-After": String(retryAfter) } : privateResponseHeaders });
}

export async function POST(request: NextRequest) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return privateJson({ error: "Требуется авторизация." }, 401);
  const retryAfter = rateLimit(authenticated.userId, "create");
  if (retryAfter) return privateJson({ error: "Слишком много запросов. Повторите попытку позже." }, 429, retryAfter);
  let payload: unknown;
  try { payload = await request.json(); } catch { return privateJson({ error: "Некорректный запрос." }, 422); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || Object.keys(payload).length !== 1 || !("listingId" in payload) || typeof (payload as { listingId?: unknown }).listingId !== "string") return privateJson({ error: "Некорректный запрос." }, 422);
  const listingId = (payload as { listingId: string }).listingId.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(listingId)) return privateJson({ error: "Некорректный идентификатор объявления." }, 422);
  const { data, error } = await authenticated.supabase.rpc("get_or_create_listing_conversation", { p_listing_id: listingId });
  if (error) return privateJson({ error: "Переписка сейчас недоступна." }, publicRpcErrorStatus(error.code));
  const row = Array.isArray(data) ? data[0] : null;
  if (!row?.conversation_id || !row.created_at) return privateJson({ error: "Переписка сейчас недоступна." }, 404);
  return privateJson({ data: { conversationId: row.conversation_id, createdAt: row.created_at } }, 200);
}

export async function GET(request: NextRequest) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return privateJson({ error: "Требуется авторизация." }, 401);
  const cursor = parseCursor(request.nextUrl.searchParams, 50);
  if (!cursor) return privateJson({ error: "Некорректные параметры страницы." }, 422);
  const { data, error } = await authenticated.supabase.rpc("list_own_conversations", { p_limit: cursor.limit, p_before_at: cursor.beforeAt, p_before_id: cursor.beforeId });
  if (error) return privateJson({ error: "Не удалось загрузить переписки." }, publicRpcErrorStatus(error.code));
  const conversations = (data ?? []).map((row: { conversation_id: string; listing_id: string; last_message_at: string | null; last_message_id: string | null; unread_count: number }) => ({ conversationId: row.conversation_id, listingId: row.listing_id, lastMessageAt: row.last_message_at, lastMessageId: row.last_message_id, unreadCount: row.unread_count }));
  return privateJson({ data: conversations }, 200);
}
