import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { releaseHeaders } from "@/lib/release/compatibility";
import { safeLog } from "@/lib/observability/safe-logger";

export const dynamic = "force-dynamic";

type ReviewPayload = {
  applicationId?: unknown;
  decision?: unknown;
  reviewNote?: unknown;
};

type ReviewRpcError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

type PublicReviewError = {
  status: number;
  message: string;
};

const allowedDecisions = new Set(["reviewing", "approved", "rejected", "archived"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const reviewRpcErrorResponses: Record<string, PublicReviewError> = {
  OT401: { status: 401, message: "Сеанс администратора не подтверждён." },
  OT403: { status: 403, message: "Для этого действия требуются права администратора." },
  OT404: { status: 404, message: "Заявка на услуги не найдена." },
  OT409: { status: 409, message: "Выбранное изменение статуса этой заявки больше не актуально." },
  OT422: { status: 400, message: "Недопустимое решение по заявке на услуги." }
};

const genericReviewError: PublicReviewError = {
  status: 500,
  message: "Не удалось обработать заявку на услуги."
};

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Сеанс администратора не найден." }, { status: 401 });
  }

  const payload = await readPayload(request);
  if (!payload.ok) {
    return NextResponse.json({ error: payload.error }, { status: 400 });
  }

  const supabase = createRequestSupabaseClient(authorization);
  if (!supabase) {
    return NextResponse.json({ error: "Отсутствуют переменные окружения Supabase." }, { status: 500 });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    if (userError) {
      safeLog("warn", "service_application_review_auth_failed", { code: userError.code ?? null });
    }
    return NextResponse.json({ error: "Сеанс администратора не подтверждён." }, { status: 401 });
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin", { uid: userData.user.id });
  if (adminError) {
    safeLog("error", "service_application_review_admin_check_failed", {
      code: adminError.code,
      userId: userData.user.id
    });
    return NextResponse.json({ error: "Не удалось проверить права администратора." }, { status: 500 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Для этого действия требуются права администратора." }, { status: 403 });
  }

  const { data, error } = await supabase.rpc("review_service_provider_application", {
    p_application_id: payload.data.applicationId,
    p_decision: payload.data.decision,
    p_review_note: payload.data.reviewNote
  });

  if (error) {
    const publicError = mapReviewRpcError(error);
    logReviewRpcError(error, publicError, {
      applicationId: payload.data.applicationId,
      decision: payload.data.decision,
      userId: userData.user.id
    });
    return NextResponse.json({ error: publicError.message }, { status: publicError.status });
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
    return { ok: false, error: "Недопустимое тело запроса." };
  }

  const applicationId = typeof payload.applicationId === "string" ? payload.applicationId.trim() : "";
  const decision = typeof payload.decision === "string" ? payload.decision.trim().toLowerCase() : "";
  const reviewNote = typeof payload.reviewNote === "string" && payload.reviewNote.trim() ? payload.reviewNote.trim() : null;

  if (!uuidPattern.test(applicationId)) {
    return { ok: false, error: "Недопустимый идентификатор заявки." };
  }
  if (!allowedDecisions.has(decision)) {
    return { ok: false, error: "Недопустимое решение по заявке." };
  }
  if ((decision === "rejected" || decision === "archived") && !reviewNote) {
    return { ok: false, error: "Для отклонения или архивации требуется примечание." };
  }

  return { ok: true, data: { applicationId, decision, reviewNote } };
}

function mapReviewRpcError(error: ReviewRpcError): PublicReviewError {
  if (error.code && reviewRpcErrorResponses[error.code]) {
    return reviewRpcErrorResponses[error.code];
  }
  return genericReviewError;
}

function logReviewRpcError(
  error: ReviewRpcError,
  publicError: PublicReviewError,
  context: { applicationId: string; decision: string; userId: string }
) {
  safeLog(publicError.status >= 500 ? "error" : "warn", "service_application_review_rpc_failed", {
    code: error.code ?? null,
    publicStatus: publicError.status,
    applicationId: context.applicationId,
    decision: context.decision,
    userId: context.userId
  });
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
