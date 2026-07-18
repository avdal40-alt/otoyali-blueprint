import { t } from "@/i18n/get-dictionary";
import { getDefaultWarnings } from "../domain/safety";
import type { AiProvider } from "./provider";

export const disabledAiProvider: AiProvider = {
  id: "disabled",
  isAvailable() {
    return false;
  },
  getCapabilities() {
    return [];
  },
  async generate(request) {
    return {
      requestId: request.requestId,
      status: "unavailable",
      message: t(request.locale, "ai.responses.disabled"),
      warnings: getDefaultWarnings("unavailable"),
      provider: "disabled",
      latencyMs: 0,
      error: {
        code: "provider_unavailable",
        message: "AI provider is disabled."
      }
    };
  }
};
