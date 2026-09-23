import { NextRequest, NextResponse } from "next/server";
import { LOCALE_HEADER_NAME, normalizeLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/types";
import { getAiServerConfig } from "@/features/ai/config";
import { generateAssistantResponse } from "@/features/ai/services/assistant-service";
import {
  malformedJsonResponse,
  oversizedPayloadResponse,
  validateAssistantRequestPayload
} from "@/features/ai/services/request-validator";
import { deriveAiActor } from "@/features/ai/services/actor";
import { getAiRateLimiter } from "@/features/ai/services/rate-limit";
import { buildServerAiContext } from "@/features/ai/services/server-context";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const config = getAiServerConfig();
  const fallbackLocale = getLocaleFromRequest(request);
  const guestKey = `guest:${request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) || "anonymous"}`;
  const actor = await deriveAiActor(request.headers.get("authorization"), guestKey);
  const contentLength = readContentLength(request.headers.get("content-length"));

  if (contentLength && contentLength > config.maxRequestBytes) {
    return NextResponse.json(oversizedPayloadResponse(fallbackLocale), { status: 413 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(malformedJsonResponse(fallbackLocale), { status: 400 });
  }

  if (byteSize(JSON.stringify(payload)) > config.maxRequestBytes) {
    return NextResponse.json(oversizedPayloadResponse(fallbackLocale), { status: 413 });
  }

  const validation = validateAssistantRequestPayload({
    payload,
    fallbackLocale,
    userAgent: request.headers.get("user-agent"),
    contentLength,
    config,
    actor
  });

  if (!validation.ok) {
    return NextResponse.json(validation.response, { status: validation.statusCode });
  }
  const limiter = getAiRateLimiter();
  if (!limiter) return NextResponse.json({ requestId: validation.request.requestId, status: "unavailable", message: "AI service unavailable.", warnings: ["provider_unavailable"], provider: "disabled", latencyMs: 0, error: { code: "feature_disabled", message: "AI is disabled." } }, { status: 503 });
  const rate = await limiter.check(actor, "assistant_chat");
  if (!rate.allowed) return NextResponse.json({ requestId: validation.request.requestId, status: "blocked", message: "Too many requests.", warnings: ["informational_only"], provider: "disabled", latencyMs: 0, error: { code: "rate_limited", message: "Too many requests." } }, { status: 429, headers: rate.retryAfterSeconds ? { "Retry-After": String(rate.retryAfterSeconds) } : undefined });

  const response = await generateAssistantResponse(await buildServerAiContext(validation.request));
  const statusCode = response.status === "error" ? 500 : 200;

  return NextResponse.json(response, { status: statusCode });
}

function getLocaleFromRequest(request: NextRequest): Locale {
  return normalizeLocale(request.headers.get(LOCALE_HEADER_NAME) ?? request.cookies.get("otoyali_locale")?.value);
}

function readContentLength(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function byteSize(value: string) {
  return new TextEncoder().encode(value).length;
}
