import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ makeId: z.string().uuid(), modelId: z.string().uuid(), generationId: z.string().uuid(), modificationId: z.string().uuid().nullable().optional(), ownershipStatus: z.enum(["current_owner", "former_owner"]), rating: z.number().int().min(1).max(5), pros: z.array(z.string().trim().min(1).max(200)).max(10).default([]), cons: z.array(z.string().trim().min(1).max(200)).max(10).default([]), body: z.string().trim().min(1).max(5000).nullable().optional() });

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "Отырыс қажет." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Пікір деректері дұрыс емес." }, { status: 400 });
  const value = parsed.data;
  const { data, error } = await supabase.schema("vehicle").from("owner_reviews").insert({ author_id: auth.user.id, make_id: value.makeId, model_id: value.modelId, generation_id: value.generationId, modification_id: value.modificationId ?? null, ownership_status: value.ownershipStatus, rating: value.rating, pros: value.pros, cons: value.cons, body: value.body ?? null }).select("id").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Бұл көлік нұсқасына пікір қалдырдыңыз." : "Пікірді сақтау мүмкін болмады." }, { status: error.code === "23505" ? 409 : 400 });
  return NextResponse.json({ id: data.id, status: "pending" }, { status: 201 });
}
