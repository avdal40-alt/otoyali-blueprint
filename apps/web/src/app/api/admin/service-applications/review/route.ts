import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ReviewPayload = {
  applicationId?: unknown;
  decision?: unknown;
  reviewNote?: unknown;
};

const allowedDecisions = new Set(["reviewing", "approved", "rejected", "archived"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Admin oturumu bulunamadı." }, { status: 401 });
  }

  const payload = await readPayload(request);
  if (!payload.ok) {
    return NextResponse.json({ error: payload.error }, { status: 400 });
  }

  const supabase = createRequestSupabaseClient(authorization);
  if (!supabase) {
    return NextResponse.json({ error: "Supabase ortam değişkenleri eksik." }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: userError?.message ?? "Admin oturumu doğrulanamadı." }, { status: 401 });
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin", { uid: userData.user.id });
  if (adminError) {
    return NextResponse.json({ error: adminError.message }, { status: 500 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Bu işlem için admin yetkisi gerekir." }, { status: 403 });
  }

  const { data, error } = await supabase.rpc("review_service_provider_application", {
    p_application_id: payload.data.applicationId,
    p_decision: payload.data.decision,
    p_review_note: payload.data.reviewNote
  });

  if (error) {
    const message = error.message.toLowerCase();
    const status = message.includes("admin") || message.includes("authorization") ? 403 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ data: Array.isArray(data) ? data[0] ?? null : data ?? null });
}

async function readPayload(request: NextRequest): Promise<
  | { ok: true; data: { applicationId: string; decision: string; reviewNote: string | null } }
  | { ok: false; error: string }
> {
  let payload: ReviewPayload;
  try {
    payload = (await request.json()) as ReviewPayload;
  } catch {
    return { ok: false, error: "Geçersiz istek gövdesi." };
  }

  const applicationId = typeof payload.applicationId === "string" ? payload.applicationId.trim() : "";
  const decision = typeof payload.decision === "string" ? payload.decision.trim().toLowerCase() : "";
  const reviewNote = typeof payload.reviewNote === "string" && payload.reviewNote.trim() ? payload.reviewNote.trim() : null;

  if (!uuidPattern.test(applicationId)) {
    return { ok: false, error: "Geçersiz başvuru kimliği." };
  }
  if (!allowedDecisions.has(decision)) {
    return { ok: false, error: "Geçersiz başvuru kararı." };
  }
  if ((decision === "rejected" || decision === "archived") && !reviewNote) {
    return { ok: false, error: "Ret veya arşiv kararı için not gerekir." };
  }

  return { ok: true, data: { applicationId, decision, reviewNote } };
}

function createRequestSupabaseClient(authorization: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: authorization
      }
    }
  });
}
