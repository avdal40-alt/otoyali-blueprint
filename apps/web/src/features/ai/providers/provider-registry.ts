import "server-only";

import { getAiServerConfig } from "../config";
import { disabledAiProvider } from "./disabled-provider";
import { localDeterministicAiProvider } from "./local-provider";
import { openAiProvider } from "./openai-provider";
import type { AiProvider } from "./provider";

export function getConfiguredAiProvider(): AiProvider {
  const config = getAiServerConfig();

  if (!config.enabled || config.provider === "disabled" || config.mode === "disabled") {
    return disabledAiProvider;
  }

  if (config.provider === "local") {
    return localDeterministicAiProvider;
  }
  if (config.provider === "openai" && config.mode === "external") return openAiProvider;

  return disabledAiProvider;
}
