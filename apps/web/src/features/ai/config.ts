import "server-only";

import type { AiCapabilityId, AiProviderId } from "./domain/types";
import { AI_SHARED_LIMITS } from "./domain/limits";

export type AiProviderMode = "local_preview" | "external" | "disabled";

export type AiServerConfig = {
  enabled: boolean;
  provider: AiProviderId;
  mode: AiProviderMode;
  allowedCapabilities: AiCapabilityId[];
  maxConversationMessages: number;
  maxUserMessageLength: number;
  maxAssistantMessageLength: number;
  maxContextBytes: number;
  maxRequestBytes: number;
  timeoutMs: number;
  debug: boolean;
};

const localPreviewCapabilities: AiCapabilityId[] = ["assistant_chat", "trust_guidance", "publishing_assistance"];

export function getAiServerConfig(): AiServerConfig {
  const enabled = readBoolean(process.env.AI_ENABLED, false);
  const rawProvider = process.env.AI_PROVIDER?.trim().toLowerCase();
  const provider = rawProvider === "openai" || rawProvider === "local" || rawProvider === "disabled" ? rawProvider : "disabled";
  const model = process.env.AI_MODEL?.trim();
  const openAiReady = provider === "openai" && enabled && Boolean(process.env.OPENAI_API_KEY?.trim()) && Boolean(model) && process.env.AI_DISTRIBUTED_RATE_LIMIT_ENABLED === "true";
  const mode: AiProviderMode = provider === "local" && !enabled ? "local_preview" : openAiReady ? "external" : "disabled";

  return {
    enabled,
    provider: mode === "disabled" ? "disabled" : provider,
    mode,
    allowedCapabilities: mode === "local_preview" ? localPreviewCapabilities : [],
    maxConversationMessages: AI_SHARED_LIMITS.maxConversationMessages,
    maxUserMessageLength: AI_SHARED_LIMITS.maxUserMessageLength,
    maxAssistantMessageLength: AI_SHARED_LIMITS.maxAssistantMessageLength,
    maxContextBytes: AI_SHARED_LIMITS.maxContextBytes,
    maxRequestBytes: AI_SHARED_LIMITS.maxRequestBytes,
    timeoutMs: AI_SHARED_LIMITS.timeoutMs,
    debug: readBoolean(process.env.AI_DEBUG, false)
  };
}

function readBoolean(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}
