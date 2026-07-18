import type { MarketplaceVerticalId } from "@/lib/marketplace/types";
import type { AiCapabilityId, AiIntentId, AiSafetyCategory, AiSurface } from "./types";

export type AiIntentAvailability = "local_preview" | "planned" | "disabled";

export type AiIntentDefinition = {
  id: AiIntentId;
  labelKey: string;
  descriptionKey: string;
  supportedVerticals: MarketplaceVerticalId[];
  requiredContext: AiSurface[];
  authRequired: boolean;
  availability: AiIntentAvailability;
  capability: AiCapabilityId;
  safetyCategory: AiSafetyCategory;
  futureCapabilityFlag: string;
};

const allVerticals: MarketplaceVerticalId[] = [
  "cars",
  "commercial",
  "marine",
  "parts",
  "services",
  "insurance",
  "motorcycles",
  "machinery",
  "mobility"
];

export const AI_INTENTS: AiIntentDefinition[] = [
  intent("general_help", allVerticals, [], false, "local_preview", "assistant_chat", "general"),
  intent("search_vehicles", ["cars"], ["home", "search", "vertical_landing"], false, "planned", "natural_language_search", "marketplace_guidance"),
  intent("compare_vehicles", ["cars"], ["search", "listing_detail"], false, "planned", "vehicle_comparison", "marketplace_guidance"),
  intent("explain_listing", ["cars"], ["listing_detail"], false, "planned", "listing_explanation", "marketplace_guidance"),
  intent("interpret_price", ["cars"], ["listing_detail", "sell"], false, "planned", "price_interpretation", "price_guidance"),
  intent("improve_listing", ["cars"], ["sell"], true, "planned", "listing_copy_improvement", "publishing_guidance"),
  intent("publishing_help", ["cars"], ["sell"], false, "local_preview", "publishing_assistance", "publishing_guidance"),
  intent("trust_and_safety", allVerticals, ["home", "search", "listing_detail", "sell", "trust"], false, "local_preview", "trust_guidance", "trust_guidance"),
  intent("ownership_guidance", ["cars"], ["profile"], true, "planned", "ownership_assistance", "ownership_guidance"),
  intent("unsupported", allVerticals, [], false, "disabled", "assistant_chat", "general")
];

export const AI_INTENT_IDS = AI_INTENTS.map((intentDefinition) => intentDefinition.id);

export function isAiIntentId(value?: string | null): value is AiIntentId {
  return AI_INTENT_IDS.includes(value as AiIntentId);
}

export function normalizeAiIntent(value?: string | null): AiIntentId {
  return isAiIntentId(value) ? value : "unsupported";
}

export function getAiIntent(id: AiIntentId) {
  return AI_INTENTS.find((intentDefinition) => intentDefinition.id === id) ?? AI_INTENTS[0];
}

export function isIntentAvailableForVertical(intentId: AiIntentId, vertical: MarketplaceVerticalId) {
  const intentDefinition = getAiIntent(intentId);
  return intentDefinition.supportedVerticals.includes(vertical) && intentDefinition.availability !== "disabled";
}

function intent(
  id: AiIntentId,
  supportedVerticals: MarketplaceVerticalId[],
  requiredContext: AiSurface[],
  authRequired: boolean,
  availability: AiIntentAvailability,
  capability: AiCapabilityId,
  safetyCategory: AiSafetyCategory
): AiIntentDefinition {
  return {
    id,
    labelKey: `ai.intents.${id}.label`,
    descriptionKey: `ai.intents.${id}.description`,
    supportedVerticals,
    requiredContext,
    authRequired,
    availability,
    capability,
    safetyCategory,
    futureCapabilityFlag: `ai.${id}.${availability}`
  };
}
