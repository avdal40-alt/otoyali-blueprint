import { NextRequest, NextResponse } from "next/server";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";

export const dynamic = "force-dynamic";

/** Returns only the current actor's canonical seller eligibility. */
export async function GET(request: NextRequest) {
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) {
    return NextResponse.json({ error: { code: "auth_required" } }, { status: 401, headers: privateApiHeaders });
  }

  const { data, error } = await authenticated.supabase.rpc("is_turkey_seller_phone_verified");
  if (error) {
    return NextResponse.json({ error: { code: "eligibility_unavailable" } }, { status: 503, headers: privateApiHeaders });
  }

  return NextResponse.json({ data: { eligible: data === true } }, { headers: privateApiHeaders });
}
