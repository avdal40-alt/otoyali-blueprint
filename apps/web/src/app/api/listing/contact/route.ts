import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { releaseHeaders } from "@/lib/release/compatibility";

export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const phonePattern = /^\+[1-9][0-9]{1,14}$/;
const privateResponseHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Authorization"
};

type ContactPayload = { listingId?: unknown };

function privateJson(body: object, status: number) {
  return NextResponse.json(body, { status, headers: privateResponseHeaders });
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return privateJson({ error: "Oturum gerekli." }, 401);
  }

  const payload = await readPayload(request);
  if (!payload.ok) {
    return privateJson({ error: payload.error }, 422);
  }

  const supabase = createRequestSupabaseClient(authorization);
  if (!supabase) {
    return privateJson({ error: "Satıcı iletişimi şu anda kullanılamıyor." }, 500);
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return privateJson({ error: "Oturum doğrulanamadı." }, 401);
  }

  const { data, error } = await supabase.rpc("get_listing_seller_contact", {
    p_listing_id: payload.listingId
  });
  if (error) {
    return privateJson({ error: "Satıcı iletişimi alınamadı." }, 403);
  }

  const phone = Array.isArray(data) ? data[0]?.phone : null;
  if (typeof phone !== "string" || !phonePattern.test(phone)) {
    return privateJson({ error: "Satıcı iletişimi bu ilan için kullanılamıyor." }, 404);
  }

  return privateJson({ data: { phone } }, 200);
}

async function readPayload(request: NextRequest): Promise<{ ok: true; listingId: string } | { ok: false; error: string }> {
  let payload: ContactPayload;
  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return { ok: false, error: "Geçersiz istek gövdesi." };
  }

  if (!payload || typeof payload !== "object" || Object.keys(payload).length !== 1 || !("listingId" in payload)) {
    return { ok: false, error: "Geçersiz istek gövdesi." };
  }

  const listingId = typeof payload.listingId === "string" ? payload.listingId.trim() : "";
  if (!uuidPattern.test(listingId)) {
    return { ok: false, error: "Geçersiz ilan kimliği." };
  }

  return { ok: true, listingId };
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
        ...releaseHeaders(),
        Authorization: authorization
      }
    }
  });
}
