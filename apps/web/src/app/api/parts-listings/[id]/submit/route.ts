import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";

const idSchema = z.string().uuid();
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Требуется авторизация." }, { status: 401, headers: privateApiHeaders });
  const id = idSchema.safeParse((await params).id);
  if (!id.success) return NextResponse.json({ error: "Некорректный идентификатор объявления." }, { status: 422, headers: privateApiHeaders });
  const { data, error } = await authenticated.supabase.rpc("submit_own_parts_listing_for_review", { p_listing_id: id.data });
  if (error || !data) return NextResponse.json({ error: "Объявление нельзя отправить на проверку." }, { status: error?.code === "OT403" ? 403 : 422, headers: privateApiHeaders });
  return NextResponse.json({ data: { status: data } }, { headers: privateApiHeaders });
}
