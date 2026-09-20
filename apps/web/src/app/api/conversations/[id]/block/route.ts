import { NextRequest, NextResponse } from "next/server";
import { isUuid, privateResponseHeaders, publicRpcErrorStatus, rateLimit, requireAuthenticatedRequest } from "@/lib/messaging/conversation-api";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const privateJson = (body: object, status: number, retryAfter?: number) => NextResponse.json(body, { status, headers: retryAfter ? { ...privateResponseHeaders, "Retry-After": String(retryAfter) } : privateResponseHeaders });

async function conversationId(context: Context) { const id = (await context.params).id.trim(); return isUuid(id) ? id : null; }

export async function POST(request: NextRequest, context: Context) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return privateJson({ error: "Oturum gerekli." }, 401);
  const id = await conversationId(context);
  if (!id) return privateJson({ error: "Geçersiz görüşme kimliği." }, 422);
  const retryAfter = rateLimit(authenticated.userId, "safety");
  if (retryAfter) return privateJson({ error: "Çok fazla istek gönderildi." }, 429, retryAfter);
  const { error } = await authenticated.supabase.rpc("block_conversation_participant", { p_conversation_id: id });
  if (error) return privateJson({ error: "İşlem tamamlanamadı." }, publicRpcErrorStatus(error.code));
  return privateJson({ data: { blocked: true } }, 200);
}

export async function DELETE(request: NextRequest, context: Context) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return privateJson({ error: "Oturum gerekli." }, 401);
  const id = await conversationId(context);
  if (!id) return privateJson({ error: "Geçersiz görüşme kimliği." }, 422);
  const retryAfter = rateLimit(authenticated.userId, "safety");
  if (retryAfter) return privateJson({ error: "Çok fazla istek gönderildi." }, 429, retryAfter);
  const { error } = await authenticated.supabase.rpc("unblock_conversation_participant", { p_conversation_id: id });
  if (error) return privateJson({ error: "İşlem tamamlanamadı." }, publicRpcErrorStatus(error.code));
  return privateJson({ data: { blocked: false } }, 200);
}
