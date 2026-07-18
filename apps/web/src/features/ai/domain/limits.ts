export const AI_SHARED_LIMITS = {
  maxConversationMessages: 8,
  maxUserMessageLength: 700,
  maxAssistantMessageLength: 1200,
  maxContextBytes: 6000,
  maxRequestBytes: 16_000,
  timeoutMs: 2500
} as const;
