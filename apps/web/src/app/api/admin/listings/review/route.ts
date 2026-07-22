import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type ListingReviewPayload = {
  listingId?: unknown;
  decision?: unknown;
  rejectionReason?: unknown;
};

type RpcError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

type PublicReviewError = {
  status: number;
  message: string;
};

const allowedDecisions = new Set(["approve", "reject"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxReasonLength = 1600;

const reviewErrorResponses: Record<string, PublicReviewError> = {
  OT401: { status: 401, message: "Admin oturumu doğrulanamadı." },
  OT403: { status: 403, message: "Bu işlem için admin yetkisi gerekir." },
  OT404: { status: 404, message: "İlan bulunamadı." },
  OT409: { status: 409, message: "Bu ilan için seçilen moderasyon kararı artık geçerli değil." },
  OT422: { status: 422, message: "Geçersiz ilan moderasyon kararı." }
};

const genericReviewError: PublicReviewError = {
  status: 500,
  message: "İlan moderasyonu tamamlanamadı."
};

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Admin oturumu bulunamadı." }, { status: 401 });
  }

  const payload = await readPayload(request);
  if (!payload.ok) {
    return NextResponse.json({ error: payload.error }, { status: 422 });
  }

  const supabase = createRequestSupabaseClient(authorization);
  if (!supabase) {
    return NextResponse.json({ error: "Supabase ortam değişkenleri eksik." }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    if (userError) {
      console.warn("Listing review auth failed", { code: userError.code ?? null });
    }
    return NextResponse.json({ error: "Admin oturumu doğrulanamadı." }, { status: 401 });
  }

  const { data, error } = await supabase.rpc("review_listing_moderation", {
    p_listing_id: payload.data.listingId,
    p_decision: payload.data.decision,
    p_rejection_reason: payload.data.rejectionReason
  });

  if (error) {
    const publicError = mapReviewRpcError(error);
    logReviewRpcError(error, publicError, {
      listingId: payload.data.listingId,
      decision: payload.data.decision,
      userId: userData.user.id
    });
    return NextResponse.json({ error: publicError.message }, { status: publicError.status });
  }

  return NextResponse.json({ data: Array.isArray(data) ? data[0] ?? null : data ?? null });
}

async function readPayload(request: NextRequest): Promise<
  | { ok: true; data: { listingId: string; decision: "approve" | "reject"; rejectionReason: string | null } }
  | { ok: false; error: string }
> {
  let payload: ListingReviewPayload;
  try {
    payload = (await request.json()) as ListingReviewPayload;
  } catch {
    return { ok: false, error: "Geçersiz istek gövdesi." };
  }

  const listingId = typeof payload.listingId === "string" ? payload.listingId.trim() : "";
  const decision = typeof payload.decision === "string" ? payload.decision.trim().toLowerCase() : "";
  const rejectionReason =
    typeof payload.rejectionReason === "string" && payload.rejectionReason.trim()
      ? payload.rejectionReason.trim().replace(/\s+/g, " ")
      : null;

  if (!uuidPattern.test(listingId)) {
    return { ok: false, error: "Geçersiz ilan kimliği." };
  }
  if (!allowedDecisions.has(decision)) {
    return { ok: false, error: "Geçersiz ilan moderasyon kararı." };
  }
  if (decision === "reject" && !rejectionReason) {
    return { ok: false, error: "Ret kararı için gerekçe gerekir." };
  }
  if (rejectionReason && rejectionReason.length > maxReasonLength) {
    return { ok: false, error: "Ret gerekçesi çok uzun." };
  }

  return {
    ok: true,
    data: {
      listingId,
      decision: decision as "approve" | "reject",
      rejectionReason
    }
  };
}

function mapReviewRpcError(error: RpcError): PublicReviewError {
  if (error.code && reviewErrorResponses[error.code]) {
    return reviewErrorResponses[error.code];
  }
  return genericReviewError;
}

function logReviewRpcError(
  error: RpcError,
  publicError: PublicReviewError,
  context: { listingId: string; decision: string; userId: string }
) {
  const payload = {
    code: error.code ?? null,
    publicStatus: publicError.status,
    listingId: context.listingId,
    decision: context.decision,
    userId: context.userId
  };

  if (publicError.status >= 500) {
    console.error("Listing review RPC failed", payload);
    return;
  }

  console.warn("Listing review RPC rejected request", payload);
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
