import { NextRequest, NextResponse } from "next/server";
import { isUuid, parseReportPayload, privateResponseHeaders, publicRpcErrorStatus, rateLimit, requireAuthenticatedRequest } from "@/lib/messaging/conversation-api";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string; messageId: string }> };
const privateJson = (body: object, status: number, retryAfter?: number) => NextResponse.json(body, { status, headers: retryAfter ? { ...privateResponseHeaders, "Retry-After": String(retryAfter) } : privateResponseHeaders });

export async function POST(request: NextRequest, context: Context) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return privateJson({ error: "Требуется авторизация." }, 401);
  const { id, messageId } = await context.params;
  if (!isUuid(id.trim()) || !isUuid(messageId.trim())) return privateJson({ error: "Некорректный запрос." }, 422);
  const retryAfter = rateLimit(authenticated.userId, "safety");
  if (retryAfter) return privateJson({ error: "Слишком много запросов. Повторите попытку позже." }, 429, retryAfter);
  let payload: unknown;
  try { payload = await request.json(); } catch { return privateJson({ error: "Некорректный запрос." }, 422); }
  const reason = parseReportPayload(payload);
  if (!reason) return privateJson({ error: "Некорректная причина жалобы." }, 422);
  const { error } = await authenticated.supabase.rpc("report_conversation_message", { p_conversation_id: id.trim(), p_message_id: messageId.trim(), p_reason: reason });
  if (error) return privateJson({ error: "Не удалось отправить жалобу." }, publicRpcErrorStatus(error.code));
  return privateJson({ data: { reported: true } }, 201);
}
