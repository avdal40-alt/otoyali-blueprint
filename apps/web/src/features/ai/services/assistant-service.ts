import "server-only";

import { getAiServerConfig } from "../config";
import { disabledAiProvider } from "../providers/disabled-provider";
import { getConfiguredAiProvider } from "../providers/provider-registry";
import { eventFromRequest, eventFromResponse, logAssistantEvent } from "./observability";
import { buildAssistantPromptMessages } from "./prompt-builder";
import { normalizeAiResponse } from "./response-normalizer";
import type { AiRequest, AiResponse } from "../domain/types";

export async function generateAssistantResponse(request: AiRequest): Promise<AiResponse> {
  const config = getAiServerConfig();
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
  } catch {
    const response = normalizeAiResponse(
      {
        requestId: request.requestId,
        status: "error",
        message: request.locale === "tr" ? "Rif şu anda yanıt veremiyor. Biraz sonra tekrar deneyin." : "Rif cannot respond right now. Please try again shortly.",
        warnings: ["informational_only"],
        provider: "disabled",
        latencyMs: 0,
        error: {
          code: "assistant_internal_error",
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
