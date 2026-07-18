import "server-only";

import type { AiCapabilityId, AiProviderId } from "./domain/types";
import { AI_SHARED_LIMITS } from "./domain/limits";

export type AiProviderMode = "local_preview" | "disabled";

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
  const enabled = readBoolean(process.env.AI_ENABLED, true);
  const rawProvider = process.env.AI_PROVIDER?.trim().toLowerCase();
  const provider = rawProvider === "disabled" ? "disabled" : rawProvider === "local" || !rawProvider ? "local" : "disabled";
  const mode: AiProviderMode = enabled && provider === "local" ? "local_preview" : "disabled";

  return {
    enabled,
    provider,
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
