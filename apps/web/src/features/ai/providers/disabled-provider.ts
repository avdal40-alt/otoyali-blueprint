import { t } from "@/i18n/get-dictionary";
import { getDefaultWarnings } from "../domain/safety";
import type { PlateDetectionRequest } from "../photo/plate-region-contract";
import type { AiProvider } from "./provider";
import type { ContextualModerationProviderInput } from "../moderation/contextual-moderation";

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
  },
  async detectPlateRegions(_request: PlateDetectionRequest) {
    throw new Error("vision_provider_unavailable");
  },
  async moderateListingContext(_input: ContextualModerationProviderInput) {
    throw new Error("contextual_moderation_provider_unavailable");
  }
};
