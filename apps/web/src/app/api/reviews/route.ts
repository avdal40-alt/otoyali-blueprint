import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { privateApiHeaders, requireAuthenticatedRequestSupabase } from "@/lib/supabase/request";

const id = z.string().uuid();
const schema = z.object({ makeId: id, modelId: id, generationId: id, modificationId: id.nullable().optional(), ownershipStatus: z.enum(["current_owner", "former_owner"]), rating: z.number().int().min(1).max(5), pros: z.array(z.string().trim().min(1).max(200)).max(10).default([]), cons: z.array(z.string().trim().min(1).max(200)).max(10).default([]), body: z.string().trim().min(1).max(5000).nullable().optional() }).strict();

export async function POST(request: NextRequest) {
  const authenticated = await requireAuthenticatedRequestSupabase(request.headers.get("authorization"));
  if (!authenticated) return NextResponse.json({ error: "Отыру қажет." }, { status: 401, headers: privateApiHeaders });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Пікір деректері дұрыс емес." }, { status: 422, headers: privateApiHeaders }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Пікір деректері дұрыс емес." }, { status: 422, headers: privateApiHeaders });
  const value = parsed.data;
  const catalog = await authenticated.supabase.schema("vehicle").from("generations")
    .select("id,model_id,models!inner(id,make_id)").eq("id", value.generationId).eq("model_id", value.modelId).maybeSingle();
  const generation = catalog.data as unknown as { id: string; model_id: string; models: { id: string; make_id: string } } | null;
  if (catalog.error || !generation || generation.models.make_id !== value.makeId) return NextResponse.json({ error: "Көлік каталогының байланысы жарамсыз." }, { status: 422, headers: privateApiHeaders });
  if (value.modificationId) {
    const modification = await authenticated.supabase.schema("vehicle").from("modifications").select("id").eq("id", value.modificationId).eq("generation_id", value.generationId).maybeSingle();
    if (modification.error || !modification.data) return NextResponse.json({ error: "Көлік каталогының байланысы жарамсыз." }, { status: 422, headers: privateApiHeaders });
  }
  const { data, error } = await authenticated.supabase.schema("vehicle").from("owner_reviews").insert({ author_id: authenticated.userId, make_id: value.makeId, model_id: value.modelId, generation_id: value.generationId, modification_id: value.modificationId ?? null, ownership_status: value.ownershipStatus, rating: value.rating, pros: value.pros, cons: value.cons, body: value.body ?? null }).select("id,moderation_status").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Бұл көлік нұсқасына пікір қалдырдыңыз." : "Пікірді сақтау мүмкін болмады." }, { status: error.code === "23505" ? 409 : 400, headers: privateApiHeaders });
  return NextResponse.json({ data: { id: data.id, status: data.moderation_status } }, { status: 201, headers: privateApiHeaders });
}
