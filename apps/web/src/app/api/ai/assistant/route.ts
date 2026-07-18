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

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const config = getAiServerConfig();
  const fallbackLocale = getLocaleFromRequest(request);
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
    config
  });

  if (!validation.ok) {
    return NextResponse.json(validation.response, { status: validation.statusCode });
  }

  const response = await generateAssistantResponse(validation.request);
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
