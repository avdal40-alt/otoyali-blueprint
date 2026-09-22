import { NextRequest, NextResponse } from "next/server";
import { privateResponseHeaders, requireAuthenticatedRequest } from "@/lib/messaging/conversation-api";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401, headers: privateResponseHeaders });
  const { data, error } = await authenticated.supabase.schema("marketplace").rpc("count_own_unread_notifications");
  return error
    ? NextResponse.json({ error: "Bildirimler yüklenemedi." }, { status: 500, headers: privateResponseHeaders })
    : NextResponse.json({ data: { count: data ?? 0 } }, { status: 200, headers: privateResponseHeaders });
}
