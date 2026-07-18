import "server-only";

import type { AiRequest, AiResponse } from "../domain/types";

export type AssistantEventName =
  | "assistant_opened"
  | "assistant_request_started"
  | "assistant_request_completed"
  | "assistant_request_failed"
  | "assistant_action_clicked"
  | "assistant_cleared";

export type AssistantEventPayload = {
  requestId?: string;
  intent?: string;
  locale?: string;
  vertical?: string;
  surface?: string;
  provider?: string;
  status?: string;
  latencyBucket?: string;
  errorCode?: string;
};

export function logAssistantEvent(name: AssistantEventName, payload: AssistantEventPayload, debug = false) {
  if (!debug) return;
  console.info("[assistant]", name, payload);
}

export function eventFromRequest(request: AiRequest): AssistantEventPayload {
  return {
    requestId: request.requestId,
    intent: request.intent,
    locale: request.locale,
    vertical: request.vertical,
    surface: request.surface
  };
}

export function eventFromResponse(response: AiResponse): AssistantEventPayload {
  return {
    requestId: response.requestId,
    provider: response.provider,
    status: response.status,
    latencyBucket: bucketLatency(response.latencyMs),
    errorCode: response.error?.code
  };
}

function bucketLatency(latencyMs: number) {
  if (latencyMs < 100) return "lt_100ms";
  if (latencyMs < 500) return "lt_500ms";
  if (latencyMs < 1000) return "lt_1000ms";
  return "gte_1000ms";
}
