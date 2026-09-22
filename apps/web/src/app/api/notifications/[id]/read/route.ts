import { NextRequest, NextResponse } from "next/server";
import { isUuid, privateResponseHeaders, requireAuthenticatedRequest } from "@/lib/messaging/conversation-api";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401, headers: privateResponseHeaders });
  const { id } = await context.params;
  if (!isUuid(id)) return NextResponse.json({ error: "Bildirim bulunamadı." }, { status: 404, headers: privateResponseHeaders });
  const { data, error } = await authenticated.supabase.schema("marketplace").rpc("mark_own_notification_read", { p_notification_id: id });
  if (error) return NextResponse.json({ error: "Bildirim güncellenemedi." }, { status: 500, headers: privateResponseHeaders });
  if (!data) return NextResponse.json({ error: "Bildirim bulunamadı." }, { status: 404, headers: privateResponseHeaders });
  return NextResponse.json({ data: { id, read: true } }, { status: 200, headers: privateResponseHeaders });
}
