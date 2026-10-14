import { NextRequest, NextResponse } from "next/server";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";
import { requireModerator } from "@/features/ai/moderation/moderator-review-runtime";

export async function GET(request: NextRequest) {
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Admin oturumu bulunamadı." }, { status: 401, headers: privateApiHeaders });
  try { await requireModerator(authenticated.supabase, authenticated.userId); } catch { return NextResponse.json({ error: "Bu işlem için admin yetkisi gerekir." }, { status: 403, headers: privateApiHeaders }); }
  const { data, error } = await authenticated.supabase.schema("vehicle").from("owner_reviews").select("id,moderation_status,rating,body,created_at").order("created_at", { ascending: false }).limit(50);
  if (error) return NextResponse.json({ error: "Пікірлерді жүктеу мүмкін болмады." }, { status: 500, headers: privateApiHeaders });
  return NextResponse.json({ data: data ?? [] }, { headers: privateApiHeaders });
}
