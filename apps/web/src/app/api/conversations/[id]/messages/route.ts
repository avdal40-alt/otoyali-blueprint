import { NextRequest, NextResponse } from "next/server";
import { isUuid, parseCursor, parseMessagePayload, privateResponseHeaders, publicRpcErrorStatus, rateLimit, requireAuthenticatedRequest } from "@/lib/messaging/conversation-api";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const privateJson = (body: object, status: number, retryAfter?: number) => NextResponse.json(body, { status, headers: retryAfter ? { ...privateResponseHeaders, "Retry-After": String(retryAfter) } : privateResponseHeaders });

async function conversationId(context: Context) { const id = (await context.params).id.trim(); return isUuid(id) ? id : null; }

export async function GET(request: NextRequest, context: Context) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return privateJson({ error: "Требуется авторизация." }, 401);
  const id = await conversationId(context); const cursor = parseCursor(request.nextUrl.searchParams, 100);
  if (!id || !cursor) return privateJson({ error: "Некорректный запрос." }, 422);
  const { data, error } = await authenticated.supabase.rpc("list_conversation_messages", { p_conversation_id: id, p_limit: cursor.limit, p_before_at: cursor.beforeAt, p_before_id: cursor.beforeId });
  if (error) return privateJson({ error: "Переписка сейчас недоступна." }, publicRpcErrorStatus(error.code));
  const messages = (data ?? []).map((row: { message_id: string; sender_id: string; body: string; created_at: string }) => ({ messageId: row.message_id, isOwn: row.sender_id === authenticated.userId, text: row.body, createdAt: row.created_at }));
  const responses = await authenticated.supabase.rpc("list_conversation_listing_responses", { p_conversation_id: id });
  if (responses.error) return privateJson({ error: "Ответы в переписке сейчас недоступны." }, publicRpcErrorStatus(responses.error.code));
  return privateJson({ data: messages, responses: responses.data ?? [] }, 200);
}

export async function POST(request: NextRequest, context: Context) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return privateJson({ error: "Требуется авторизация." }, 401);
  const id = await conversationId(context);
  if (!id) return privateJson({ error: "Некорректный идентификатор переписки." }, 422);
  const retryAfter = rateLimit(authenticated.userId, "send");
  if (retryAfter) return privateJson({ error: "Слишком много запросов. Повторите попытку позже." }, 429, retryAfter);
  let payload: unknown;
  try { payload = await request.json(); } catch { return privateJson({ error: "Некорректный запрос." }, 422); }
  const text = parseMessagePayload(payload);
  if (text === null) return privateJson({ error: "Некорректное сообщение." }, 422);
  const { data, error } = await authenticated.supabase.rpc("send_conversation_message", { p_conversation_id: id, p_body: text });
  if (error) return privateJson({ error: "Не удалось отправить сообщение." }, publicRpcErrorStatus(error.code));
  const row = Array.isArray(data) ? data[0] : null;
  if (!row?.message_id || !row.created_at) return privateJson({ error: "Не удалось отправить сообщение." }, 500);
  return privateJson({ data: { messageId: row.message_id, createdAt: row.created_at } }, 201);
}

export async function PUT(request: NextRequest, context: Context) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return privateJson({ error: "Требуется авторизация." }, 401);
  const id = await conversationId(context);
  if (!id) return privateJson({ error: "Некорректный идентификатор переписки." }, 422);
  let payload: unknown; try { payload = await request.json(); } catch { return privateJson({ error: "Некорректный запрос." }, 422); }
  const listingId = typeof payload === "object" && payload !== null && "listingId" in payload && typeof payload.listingId === "string" ? payload.listingId : "";
  const { data, error } = await authenticated.supabase.rpc("attach_own_active_listing_response", { p_conversation_id: id, p_listing_id: listingId });
  if (error) return privateJson({ error: "Не удалось добавить ответ с объявлением." }, publicRpcErrorStatus(error.code));
  return privateJson({ data: Array.isArray(data) ? data[0] ?? null : data }, 201);
}
