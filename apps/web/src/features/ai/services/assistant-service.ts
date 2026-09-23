import "server-only";

import { getAiServerConfig } from "../config";
import { disabledAiProvider } from "../providers/disabled-provider";
import { getConfiguredAiProvider } from "../providers/provider-registry";
import { eventFromRequest, eventFromResponse, logAssistantEvent } from "./observability";
import { buildAssistantPromptMessages } from "./prompt-builder";
import { normalizeAiResponse } from "./response-normalizer";
import type { AiRequest, AiResponse } from "../domain/types";
import { executeNaturalLanguageSearch } from "../search/search-service";

export async function generateAssistantResponse(request: AiRequest): Promise<AiResponse> {
  const config = getAiServerConfig();
  if (request.intent === "search_vehicles" && config.mode === "local_preview") return executeNaturalLanguageSearch(request);
  const promptMessages = buildAssistantPromptMessages(request);
  const provider = getConfiguredAiProvider();

  logAssistantEvent("assistant_request_started", eventFromRequest(request), config.debug);

  try {
    if (!(await provider.isAvailable())) {
      const disabledResponse = await disabledAiProvider.generate(request);
      const normalized = normalizeAiResponse(disabledResponse, request.requestId);
      logAssistantEvent("assistant_request_completed", eventFromResponse(normalized), config.debug);
      return normalized;
    }

    if (promptMessages.length === 0) {
      throw new Error("assistant_prompt_empty");
    }

    const response = await withTimeout(provider.generate(request), config.timeoutMs);
    const normalized = normalizeAiResponse(response, request.requestId);
    logAssistantEvent("assistant_request_completed", eventFromResponse(normalized), config.debug);
    return normalized;
  } catch (error) {
    const code = error instanceof Error && error.message === "assistant_timeout" ? "timeout" : error instanceof Error && error.message === "model_unavailable" ? "model_unavailable" : "generic_retryable";
    const response = normalizeAiResponse(
      {
        requestId: request.requestId,
        status: "error",
        message: request.locale === "tr" ? "Rif şu anda yanıt veremiyor. Biraz sonra tekrar deneyin." : "Rif cannot respond right now. Please try again shortly.",
        warnings: ["informational_only"],
        provider: "disabled",
        latencyMs: 0,
        error: {
          code,
          message: "Assistant request failed."
        }
      },
      request.requestId
    );
    logAssistantEvent("assistant_request_failed", { ...eventFromRequest(request), errorCode: response.error?.code }, config.debug);
    return response;
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("assistant_timeout")), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
