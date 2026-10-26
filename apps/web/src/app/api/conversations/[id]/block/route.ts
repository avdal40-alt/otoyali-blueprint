import { NextRequest, NextResponse } from "next/server";
import { isUuid, privateResponseHeaders, publicRpcErrorStatus, rateLimit, requireAuthenticatedRequest } from "@/lib/messaging/conversation-api";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const privateJson = (body: object, status: number, retryAfter?: number) => NextResponse.json(body, { status, headers: retryAfter ? { ...privateResponseHeaders, "Retry-After": String(retryAfter) } : privateResponseHeaders });

async function conversationId(context: Context) { const id = (await context.params).id.trim(); return isUuid(id) ? id : null; }

export async function POST(request: NextRequest, context: Context) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return privateJson({ error: "Требуется авторизация." }, 401);
  const id = await conversationId(context);
  if (!id) return privateJson({ error: "Некорректный идентификатор переписки." }, 422);
  const retryAfter = rateLimit(authenticated.userId, "safety");
  if (retryAfter) return privateJson({ error: "Слишком много запросов. Повторите попытку позже." }, 429, retryAfter);
  const { error } = await authenticated.supabase.rpc("block_conversation_participant", { p_conversation_id: id });
  if (error) return privateJson({ error: "Не удалось выполнить действие." }, publicRpcErrorStatus(error.code));
  return privateJson({ data: { blocked: true } }, 200);
}

export async function GET(request: NextRequest, context: Context) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return privateJson({ error: "Требуется авторизация." }, 401);
  const id = await conversationId(context);
  if (!id) return privateJson({ error: "Некорректный идентификатор переписки." }, 422);
  const { data, error } = await authenticated.supabase.rpc("get_conversation_send_state", { p_conversation_id: id });
  if (error) return privateJson({ error: "Переписка сейчас недоступна." }, publicRpcErrorStatus(error.code));
  const row = Array.isArray(data) ? data[0] : null;
  if (typeof row?.is_blocked !== "boolean") return privateJson({ error: "Переписка сейчас недоступна." }, 404);
  return privateJson({ data: { blocked: row.is_blocked } }, 200);
}

export async function DELETE(request: NextRequest, context: Context) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return privateJson({ error: "Требуется авторизация." }, 401);
  const id = await conversationId(context);
  if (!id) return privateJson({ error: "Некорректный идентификатор переписки." }, 422);
  const retryAfter = rateLimit(authenticated.userId, "safety");
  if (retryAfter) return privateJson({ error: "Слишком много запросов. Повторите попытку позже." }, 429, retryAfter);
  const { error } = await authenticated.supabase.rpc("unblock_conversation_participant", { p_conversation_id: id });
  if (error) return privateJson({ error: "Не удалось выполнить действие." }, publicRpcErrorStatus(error.code));
  return privateJson({ data: { blocked: false } }, 200);
}
