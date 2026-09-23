import "server-only";
import { aiModelClassSchema } from "./schemas";

export type AiModelClass = "FAST" | "REASONING" | "VISION";
export const AI_MODEL_REGISTRY = {
  FAST: { provider: "openai", id: "gpt-4o-mini", maxOutputTokens: 600, timeoutMs: 8_000, retries: 1, maxToolIterations: 2, vision: false },
  REASONING: { provider: "openai", id: "gpt-4o", maxOutputTokens: 900, timeoutMs: 12_000, retries: 1, maxToolIterations: 3, vision: false },
  VISION: { provider: "openai", id: "gpt-4o", maxOutputTokens: 700, timeoutMs: 12_000, retries: 0, maxToolIterations: 1, vision: true }
} as const;

export function getAiModel(modelClass: AiModelClass, configuredModel?: string) {
  aiModelClassSchema.parse(modelClass);
  const model = AI_MODEL_REGISTRY[modelClass];
  if (configuredModel && configuredModel !== model.id) return null;
  return model;
}
