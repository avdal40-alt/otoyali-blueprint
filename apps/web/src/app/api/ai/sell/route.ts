import { NextRequest, NextResponse } from "next/server";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";
import { runSellAssistant } from "@/features/ai/sell/sell-runtime";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: { code: "auth_required" } }, { status: 401, headers: privateApiHeaders });
  let payload: unknown; try { payload = await request.json(); } catch { return NextResponse.json({ error: { code: "invalid_input" } }, { status: 422, headers: privateApiHeaders }); }
  const result = await runSellAssistant(authenticated, payload);
  return result.ok ? NextResponse.json({ data: result }, { headers: privateApiHeaders }) : NextResponse.json({ error: { code: result.code } }, { status: result.status, headers: privateApiHeaders });
}
