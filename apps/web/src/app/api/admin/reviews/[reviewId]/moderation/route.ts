import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";
import { requireModerator } from "@/features/ai/moderation/moderator-review-runtime";

const idSchema = z.string().uuid();
const payloadSchema = z.object({ decision: z.enum(["approve", "reject", "hide", "restore"]), reason: z.string().trim().min(1).max(1000).nullable().optional() }).strict();

export async function POST(request: NextRequest, context: { params: Promise<{ reviewId: string }> }) {
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Сеанс администратора не найден." }, { status: 401, headers: privateApiHeaders });
  try { await requireModerator(authenticated.supabase, authenticated.userId); } catch { return NextResponse.json({ error: "Для этого действия требуются права администратора." }, { status: 403, headers: privateApiHeaders }); }
  const { reviewId } = await context.params;
  if (!idSchema.safeParse(reviewId).success) return NextResponse.json({ error: "Недопустимый идентификатор отзыва." }, { status: 422, headers: privateApiHeaders });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Недопустимое тело запроса." }, { status: 422, headers: privateApiHeaders }); }
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success || (["reject", "hide"].includes(parsed.data.decision) && !parsed.data.reason)) return NextResponse.json({ error: "Недопустимое решение модерации." }, { status: 422, headers: privateApiHeaders });
  const { data, error } = await authenticated.supabase.rpc("moderate_vehicle_owner_review", { p_review_id: reviewId, p_decision: parsed.data.decision, p_reason: parsed.data.reason ?? null });
  if (error) { const status = error.code === "OT404" ? 404 : error.code === "OT409" ? 409 : error.code === "OT422" ? 422 : 500; return NextResponse.json({ error: status === 500 ? "Не удалось применить решение модерации." : "Недопустимое или устаревшее решение модерации." }, { status, headers: privateApiHeaders }); }
  return NextResponse.json({ data: Array.isArray(data) ? data[0] ?? null : data ?? null }, { headers: privateApiHeaders });
}
