import { DEFAULT_LOCALE, isSupportedLocale, normalizeLocale } from "@/i18n/config";
import { t } from "@/i18n/get-dictionary";
import type { Locale } from "@/i18n/types";
import { isMarketplaceVerticalId } from "@/lib/marketplace/verticals";
import type { AiServerConfig } from "../config";
import { isAiIntentId } from "../domain/intents";
import { cleanOptionalText, sanitizeAssistantContext } from "../domain/safety";
import type { AiContext, AiConversationMessage, AiIntentId, AiRequest, AiResponse, AiSurface, AiUserState } from "../domain/types";

type ValidationResult =
  | {
      ok: true;
      request: AiRequest;
    }
  | {
      ok: false;
      statusCode: number;
      response: AiResponse;
    };

const allowedSurfaces: AiSurface[] = [
  "global",
  "home",
  "search",
  "listing_detail",
  "sell",
  "profile",
  "favorites",
  "video",
  "vertical_landing",
  "trust",
  "admin"
];

export function validateAssistantRequestPayload({
  payload,
  fallbackLocale,
  userAgent,
  contentLength,
  config
}: {
  payload: unknown;
  fallbackLocale: Locale;
  userAgent?: string | null;
  contentLength?: number;
  config: AiServerConfig;
}): ValidationResult {
  if (!isObject(payload)) {
    return validationError("invalid_request", fallbackLocale, "ai.errors.invalidRequest", 400);
  }

  const requestId = readString(payload.requestId, 80) ?? createRequestId();
  const localeValidation = readLocale(payload.locale, fallbackLocale);
  if (!localeValidation.ok) {
    return validationError("unsupported_locale", fallbackLocale, "ai.errors.unsupportedLocale", 400, requestId);
  }
  const locale = localeValidation.locale;

  const userMessage = readRawString(payload.userMessage)?.trim();
  if (!userMessage) return validationError("empty_message", locale, "ai.errors.emptyMessage", 400, requestId);
  if (userMessage.length > config.maxUserMessageLength) return validationError("message_too_long", locale, "ai.errors.messageTooLong", 413, requestId);

  const conversationResult = readConversation(payload.conversation, config.maxConversationMessages, config.maxUserMessageLength);
  if (!conversationResult.ok) return validationError(conversationResult.code, locale, conversationResult.messageKey, 413, requestId);

  const intent = payload.intent === undefined ? "general_help" : readIntent(payload.intent);
  if (!intent) return validationError("invalid_intent", locale, "ai.errors.unsupportedIntent", 400, requestId);

  const contextResult = readContext(payload.context, locale);
  if (!contextResult.ok) return validationError(contextResult.code, locale, contextResult.messageKey, 400, requestId);

  const contextBytes = byteSize(JSON.stringify(contextResult.context));
  if (contextBytes > config.maxContextBytes) return validationError("context_too_large", locale, "ai.errors.contextTooLarge", 413, requestId);

  return {
    ok: true,
    request: {
      requestId,
      locale,
      intent,
      userMessage,
      conversation: conversationResult.conversation,
      context: contextResult.context,
      vertical: contextResult.context.vertical,
      surface: contextResult.context.surface,
      userState: { authenticated: false, role: "guest" },
      metadata: {
        userAgent: cleanOptionalText(userAgent, 160) ?? undefined,
        contentLength
      }
    }
  };
}

export function malformedJsonResponse(locale: Locale = DEFAULT_LOCALE): AiResponse {
  return buildErrorResponse("malformed_json", locale, "ai.errors.malformedJson", "error");
}

export function oversizedPayloadResponse(locale: Locale = DEFAULT_LOCALE): AiResponse {
  return buildErrorResponse("payload_too_large", locale, "ai.errors.payloadTooLarge", "blocked");
}

function readLocale(value: unknown, fallbackLocale: Locale): { ok: true; locale: Locale } | { ok: false } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, locale: fallbackLocale };
  }

  if (typeof value !== "string") return { ok: false };
  const candidate = value.toLowerCase().split(/[-_]/)[0];
  if (!isSupportedLocale(candidate)) return { ok: false };
  return { ok: true, locale: normalizeLocale(candidate) };
}

function readIntent(value: unknown): AiIntentId | null {
  if (typeof value !== "string") return null;
  return isAiIntentId(value) ? value : null;
}

function readConversation(value: unknown, maxMessages: number, maxLength: number) {
  if (value === undefined || value === null) return { ok: true as const, conversation: [] };
  if (!Array.isArray(value)) return { ok: false as const, code: "invalid_conversation", messageKey: "ai.errors.invalidRequest" };
  if (value.length > maxMessages) return { ok: false as const, code: "conversation_too_long", messageKey: "ai.errors.conversationTooLong" };

  const conversation: AiConversationMessage[] = [];
  for (const item of value) {
    if (!isObject(item)) return { ok: false as const, code: "invalid_conversation", messageKey: "ai.errors.invalidRequest" };
    const role = item.role === "assistant" ? "assistant" : item.role === "user" ? "user" : null;
    const content = readRawString(item.content)?.trim();
    if (content && content.length > maxLength) return { ok: false as const, code: "conversation_message_too_long", messageKey: "ai.errors.messageTooLong" };
    if (!role || !content) return { ok: false as const, code: "invalid_conversation", messageKey: "ai.errors.invalidRequest" };
    conversation.push({
      id: readString(item.id, 80) ?? undefined,
      role,
      content,
      createdAt: readString(item.createdAt, 40) ?? undefined
    });
  }

  return { ok: true as const, conversation };
}

function readContext(value: unknown, locale: Locale) {
  if (!isObject(value)) {
    return {
      ok: true as const,
      context: sanitizeAssistantContext({
        surface: "global",
        locale,
        vertical: "cars",
        userState: { authenticated: false, role: "guest" }
      })
    };
  }

  const rawVertical = readString(value.vertical, 40) ?? "cars";
  if (!isMarketplaceVerticalId(rawVertical)) {
    return { ok: false as const, code: "invalid_vertical", messageKey: "ai.errors.invalidVertical" };
  }

  const surface = allowedSurfaces.includes(value.surface as AiSurface) ? (value.surface as AiSurface) : "global";
  const userState: AiUserState = { authenticated: false, role: "guest" };
  const context: AiContext = {
    surface,
    locale,
    vertical: rawVertical,
    currentRoute: readString(value.currentRoute, 220) ?? undefined,
    userState
  };

  if (isObject(value.listing) && typeof value.listing.listingId === "string") {
    context.listing = {
      listingId: value.listing.listingId.slice(0, 80),
      vertical: rawVertical,
      title: cleanOptionalText(value.listing.title, 120),
      priceAmount: typeof value.listing.priceAmount === "number" ? value.listing.priceAmount : null,
      currency: cleanOptionalText(value.listing.currency, 8),
      make: cleanOptionalText(value.listing.make, 60),
      model: cleanOptionalText(value.listing.model, 80),
      year: typeof value.listing.year === "number" ? value.listing.year : null,
      mileageKm: typeof value.listing.mileageKm === "number" ? value.listing.mileageKm : null,
      fuel: cleanOptionalText(value.listing.fuel, 40),
      transmission: cleanOptionalText(value.listing.transmission, 40),
      city: cleanOptionalText(value.listing.city, 60),
      sellerType: cleanOptionalText(value.listing.sellerType, 40),
      status: cleanOptionalText(value.listing.status, 40),
      descriptionExcerpt: cleanOptionalText(value.listing.descriptionExcerpt, 280)
    };
  }

  if (isObject(value.search)) {
    context.search = {
      query: cleanOptionalText(value.search.query, 120),
      make: cleanOptionalText(value.search.make, 60),
      model: cleanOptionalText(value.search.model, 80),
      city: cleanOptionalText(value.search.city, 60),
      condition: cleanOptionalText(value.search.condition, 40)
    };
  }

  if (isObject(value.publishing)) {
    context.publishing = {
      vertical: rawVertical,
      step: cleanOptionalText(value.publishing.step, 80),
      hasPhotos: typeof value.publishing.hasPhotos === "boolean" ? value.publishing.hasPhotos : null
    };
  }

  return { ok: true as const, context: sanitizeAssistantContext(context) };
}

function validationError(code: string, locale: Locale, messageKey: string, statusCode: number, requestId = createRequestId()): ValidationResult {
  return {
    ok: false,
    statusCode,
    response: buildErrorResponse(code, locale, messageKey, code === "invalid_intent" || code === "invalid_vertical" ? "unsupported" : "error", requestId)
  };
}

function buildErrorResponse(code: string, locale: Locale, messageKey: string, status: AiResponse["status"], requestId = createRequestId()): AiResponse {
  return {
    requestId,
    status,
    message: t(locale, messageKey),
    warnings: status === "unsupported" ? ["feature_not_connected"] : ["informational_only"],
    provider: "disabled",
    latencyMs: 0,
    error: {
      code,
      message: t(locale, messageKey)
    }
  };
}

function readString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  if (byteSize(value) > maxLength * 4) return value.slice(0, maxLength);
  return value.slice(0, maxLength);
}

function readRawString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function byteSize(value: string) {
  return new TextEncoder().encode(value).length;
}

function createRequestId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `ai_${Date.now().toString(36)}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
