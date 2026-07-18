"use client";

import { useCallback, useState } from "react";
import { AI_SHARED_LIMITS } from "../domain/limits";
import type { AiAction, AiContext, AiConversationMessage, AiIntentId, AiResponse, AiStructuredData, AiWarningCode } from "../domain/types";

export type AssistantChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: AiResponse["status"];
  actions?: AiAction[];
  structuredData?: AiStructuredData[];
  warnings?: AiWarningCode[];
};

export function useAssistant(context: AiContext) {
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (rawMessage: string, intent: AiIntentId = "general_help") => {
      const userMessage = rawMessage.trim();
      if (!userMessage || isLoading) return;

      if (userMessage.length > AI_SHARED_LIMITS.maxUserMessageLength) {
        setError(context.locale === "tr" ? "Mesaj çok uzun. Lütfen daha kısa yazın." : "Message is too long. Please shorten it.");
        return;
      }

      const userChatMessage: AssistantChatMessage = {
        id: createMessageId(),
        role: "user",
        content: userMessage
      };

      const nextMessages = [...messages, userChatMessage].slice(-AI_SHARED_LIMITS.maxConversationMessages);
      setMessages(nextMessages);
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/ai/assistant", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({
            requestId: createMessageId(),
            locale: context.locale,
            intent,
            userMessage,
            conversation: nextMessages.map(toConversationMessage),
            context
          })
        });
        const payload: unknown = await response.json();
        const assistantResponse = normalizeClientResponse(payload);

        if (!assistantResponse) {
          throw new Error("invalid_assistant_response");
        }

        const assistantMessage: AssistantChatMessage = {
          id: assistantResponse.requestId,
          role: "assistant",
          content: assistantResponse.message,
          status: assistantResponse.status,
          actions: assistantResponse.actions,
          structuredData: assistantResponse.structuredData,
          warnings: assistantResponse.warnings
        };
        setMessages((current) => [...current, assistantMessage].slice(-AI_SHARED_LIMITS.maxConversationMessages));
      } catch {
        const fallback = context.locale === "tr" ? "Rif şu anda yanıt veremiyor. Biraz sonra tekrar deneyin." : "Rif cannot respond right now. Please try again shortly.";
        setError(fallback);
        const assistantMessage: AssistantChatMessage = {
          id: createMessageId(),
          role: "assistant",
          content: fallback,
          status: "error",
          warnings: ["informational_only"]
        };
        setMessages((current) => [...current, assistantMessage].slice(-AI_SHARED_LIMITS.maxConversationMessages));
      } finally {
        setIsLoading(false);
      }
    },
    [context, isLoading, messages]
  );

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clear
  };
}

function toConversationMessage(message: AssistantChatMessage): AiConversationMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content
  };
}

function normalizeClientResponse(value: unknown): AiResponse | null {
  if (!value || typeof value !== "object") return null;
  const response = value as Partial<AiResponse>;
  if (typeof response.requestId !== "string" || typeof response.message !== "string") return null;
  if (!response.status || !["success", "unavailable", "unsupported", "needs_clarification", "blocked", "error"].includes(response.status)) return null;
  return response as AiResponse;
}

function createMessageId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `ai_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}
