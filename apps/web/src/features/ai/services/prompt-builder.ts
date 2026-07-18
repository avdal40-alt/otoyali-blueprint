import { AI_SAFETY_POLICY_RULES } from "../domain/safety";
import type { AiRequest } from "../domain/types";

export type AiPromptMessage = {
  role: "system" | "developer" | "user";
  content: string;
};

export function buildAssistantPromptMessages(request: AiRequest): AiPromptMessage[] {
  return [
    {
      role: "system",
      content: [
        "You are the OTOYALI assistant foundation.",
        "Separate listing-provided information, platform-verified information, assistant interpretation, general guidance, and unavailable information.",
        ...AI_SAFETY_POLICY_RULES
      ].join("\n")
    },
    {
      role: "developer",
      content: JSON.stringify({
        product: "OTOYALI",
        locale: request.locale,
        vertical: request.vertical,
        surface: request.surface,
        intent: request.intent,
        responseFormat: "AiResponse JSON"
      })
    },
    {
      role: "user",
      content: request.userMessage
    }
  ];
}
