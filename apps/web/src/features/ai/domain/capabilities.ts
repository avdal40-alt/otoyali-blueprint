import type { MarketplaceVerticalId } from "@/lib/marketplace/types";
import type { AiCapabilityId, AiCapabilityLifecycle } from "./types";

export type AiCapabilityDefinition = {
  id: AiCapabilityId;
  labelKey: string;
  descriptionKey: string;
  lifecycle: AiCapabilityLifecycle;
  supportedVerticals: MarketplaceVerticalId[];
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

export const AI_CAPABILITIES: AiCapabilityDefinition[] = [
  capability("assistant_chat", "local_preview", allVerticals),
  capability("trust_guidance", "local_preview", allVerticals),
  capability("publishing_assistance", "local_preview", ["cars"]),
  capability("natural_language_search", "planned", ["cars"]),
  capability("listing_explanation", "planned", ["cars"]),
  capability("vehicle_comparison", "planned", ["cars"]),
  capability("price_interpretation", "planned", ["cars"]),
  capability("listing_copy_improvement", "planned", ["cars"]),
  capability("ownership_assistance", "planned", ["cars"])
];

export function getAiCapability(id: AiCapabilityId) {
  return AI_CAPABILITIES.find((capabilityDefinition) => capabilityDefinition.id === id);
}

export function getAiCapabilitiesForVertical(vertical: MarketplaceVerticalId) {
  return AI_CAPABILITIES.filter((capabilityDefinition) => capabilityDefinition.supportedVerticals.includes(vertical));
}

export function isAiCapabilityUsable(id: AiCapabilityId, vertical: MarketplaceVerticalId) {
  const capabilityDefinition = getAiCapability(id);
  return Boolean(
    capabilityDefinition &&
      capabilityDefinition.supportedVerticals.includes(vertical) &&
      (capabilityDefinition.lifecycle === "available" || capabilityDefinition.lifecycle === "local_preview")
  );
}

function capability(
  id: AiCapabilityId,
  lifecycle: AiCapabilityLifecycle,
  supportedVerticals: MarketplaceVerticalId[]
): AiCapabilityDefinition {
  return {
    id,
    labelKey: `ai.capabilities.${id}.label`,
    descriptionKey: `ai.capabilities.${id}.description`,
    lifecycle,
    supportedVerticals
  };
}
