import "server-only";
import type { AiCapabilityId } from "./domain/types";

const futureFeatures = ["ai_search", "ai_listing_qa", "ai_compare", "ai_sell", "ai_vision", "ai_price", "ai_vin", "ai_moderation"] as const;
export type AiFeature = AiCapabilityId | (typeof futureFeatures)[number];

export function isAiFeatureEnabled(feature: AiFeature) {
  if (process.env.AI_ENABLED?.trim().toLowerCase() !== "true") return feature === "assistant_chat" && process.env.AI_PROVIDER?.trim().toLowerCase() !== "openai";
  if (futureFeatures.includes(feature as (typeof futureFeatures)[number])) return process.env[`AI_${feature.slice(3).toUpperCase()}_ENABLED`] === "true";
  return true;
}
