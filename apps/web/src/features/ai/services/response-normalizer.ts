import { normalizeAssistantActions } from "../domain/actions";
import { AI_SHARED_LIMITS } from "../domain/limits";
import { normalizeWarnings, truncateAssistantText } from "../domain/safety";
import type { AiResponse, AiResponseStatus, AiStructuredData } from "../domain/types";

const allowedStatuses: AiResponseStatus[] = ["success", "unavailable", "unsupported", "needs_clarification", "blocked", "error"];

export function normalizeAiResponse(response: AiResponse, fallbackRequestId: string): AiResponse {
  const status = allowedStatuses.includes(response.status) ? response.status : "error";
  const message = truncateAssistantText(response.message || "Assistant response unavailable.", AI_SHARED_LIMITS.maxAssistantMessageLength);

  return {
    requestId: response.requestId || fallbackRequestId,
    status,
    message,
    structuredData: normalizeStructuredData(response.structuredData),
    suggestions: normalizeStringList(response.suggestions, 4, 120),
    actions: normalizeAssistantActions(response.actions),
    citations: response.citations?.map((citation) => ({ label: citation.label.slice(0, 80), href: citation.href?.slice(0, 160) })).slice(0, 4),
    warnings: normalizeWarnings(response.warnings),
    confidence: typeof response.confidence === "number" && response.confidence >= 0 && response.confidence <= 1 ? response.confidence : undefined,
    provider: response.provider === "local" ? "local" : "disabled",
    latencyMs: Number.isFinite(response.latencyMs) ? Math.max(0, Math.round(response.latencyMs)) : 0,
    error: response.error
      ? {
          code: response.error.code.slice(0, 80),
          message: response.error.message.slice(0, 160)
        }
      : undefined
  };
}

function normalizeStructuredData(data?: AiStructuredData[]) {
  return (data ?? []).slice(0, 3).map((item) => {
    if (item.type === "assistant_intro") {
      return {
        type: item.type,
        capabilities: item.capabilities.slice(0, 6)
      };
    }

    if (item.type === "search_guidance") {
      return {
        type: item.type,
        filters: normalizeStringList(item.filters, 8, 60)
      };
    }

    return {
      type: item.type,
      items: item.items.slice(0, 8).map((checklistItem) => ({
        id: checklistItem.id.slice(0, 60),
        label: checklistItem.label.slice(0, 120),
        status: checklistItem.status
      }))
    };
  });
}

function normalizeStringList(values: string[] | undefined, maxItems: number, maxLength: number) {
  return (values ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.slice(0, maxLength))
    .slice(0, maxItems);
}
