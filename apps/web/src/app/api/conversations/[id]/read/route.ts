import { NextRequest, NextResponse } from "next/server";
import { isUuid, parseReadPayload, privateResponseHeaders, publicRpcErrorStatus, requireAuthenticatedRequest } from "@/lib/messaging/conversation-api";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
const privateJson = (body: object, status: number) => NextResponse.json(body, { status, headers: privateResponseHeaders });

export async function POST(request: NextRequest, context: Context) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return privateJson({ error: "Oturum gerekli." }, 401);
  const id = (await context.params).id.trim();
  if (!isUuid(id)) return privateJson({ error: "Geçersiz görüşme kimliği." }, 422);
  let payload: unknown;
  try { payload = await request.json(); } catch { return privateJson({ error: "Geçersiz istek gövdesi." }, 422); }
  const messageId = parseReadPayload(payload);
  if (!messageId) return privateJson({ error: "Geçersiz mesaj kimliği." }, 422);
  const { error } = await authenticated.supabase.rpc("mark_conversation_read", { p_conversation_id: id, p_message_id: messageId });
  if (error) return privateJson({ error: "Görüşme kullanılamıyor." }, publicRpcErrorStatus(error.code));
  return privateJson({ data: { updated: true } }, 200);
}
