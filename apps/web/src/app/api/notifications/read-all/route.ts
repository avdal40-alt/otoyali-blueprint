import { NextRequest, NextResponse } from "next/server";
import { privateResponseHeaders, requireAuthenticatedRequest } from "@/lib/messaging/conversation-api";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authenticated = await requireAuthenticatedRequest(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Oturum gerekli." }, { status: 401, headers: privateResponseHeaders });
  const { data, error } = await authenticated.supabase.schema("marketplace").rpc("mark_all_own_notifications_read");
  return error
    ? NextResponse.json({ error: "Bildirimler güncellenemedi." }, { status: 500, headers: privateResponseHeaders })
    : NextResponse.json({ data: { marked: data ?? 0 } }, { status: 200, headers: privateResponseHeaders });
}
