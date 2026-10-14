import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";

const payloadSchema = z.object({ reason: z.enum(["spam", "abuse", "wrong_information", "duplicate", "other"]), details: z.string().trim().min(1).max(1000).nullable().optional() }).strict();
const idSchema = z.string().uuid();

export async function POST(request: NextRequest, context: { params: Promise<{ reviewId: string }> }) {
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Пікірге шағымдану үшін жүйеге кіріңіз." }, { status: 401, headers: privateApiHeaders });
  const { reviewId } = await context.params;
  if (!idSchema.safeParse(reviewId).success) return NextResponse.json({ error: "Пікір деректері дұрыс емес." }, { status: 422, headers: privateApiHeaders });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Шағым деректері дұрыс емес." }, { status: 422, headers: privateApiHeaders }); }
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Шағым деректері дұрыс емес." }, { status: 422, headers: privateApiHeaders });
  const { data, error } = await authenticated.supabase.rpc("report_vehicle_owner_review", { p_review_id: reviewId, p_reason: parsed.data.reason, p_details: parsed.data.details ?? null });
  if (error) {
    const status = error.code === "OT401" ? 401 : error.code === "OT404" ? 404 : error.code === "OT429" ? 429 : 422;
    return NextResponse.json({ error: status === 429 ? "Шағымдар шегіне жеттіңіз." : "Шағым жіберілмеді." }, { status, headers: privateApiHeaders });
  }
  return NextResponse.json({ data: { reported: Boolean(data), duplicate: !data } }, { status: data ? 201 : 200, headers: privateApiHeaders });
}
