import type { AiIntentId, AiSurface } from "./types";

export type AiSuggestionDefinition = {
  id: string;
  textKey: string;
  intent: AiIntentId;
  surfaces: AiSurface[];
};

export const AI_SUGGESTIONS: AiSuggestionDefinition[] = [
  suggestion("home_find_vehicle", "ai.suggestions.home.findVehicle", "general_help", ["home", "global", "vertical_landing"]),
  suggestion("home_used_car_checks", "ai.suggestions.home.usedCarChecks", "trust_and_safety", ["home", "search", "listing_detail", "global"]),
  suggestion("home_what_can_rif_do", "ai.suggestions.home.whatCanRifDo", "general_help", ["home", "global", "vertical_landing"]),
  suggestion("search_filters_tr", "ai.suggestions.search.filters", "search_vehicles", ["search"]),
  suggestion("listing_review", "ai.suggestions.listing.review", "explain_listing", ["listing_detail"]),
  suggestion("sell_better_listing", "ai.suggestions.sell.betterListing", "publishing_help", ["sell"]),
  suggestion("trust_safety", "ai.suggestions.trust.safety", "trust_and_safety", ["trust", "listing_detail", "sell"]),
  suggestion("services_category", "ai.suggestions.services.category", "trust_and_safety", ["service_marketplace", "service_provider"]),
  suggestion("services_booking", "ai.suggestions.services.booking", "general_help", ["service_marketplace", "service_provider"])
];

export function getSuggestionsForSurface(surface: AiSurface) {
  const matched = AI_SUGGESTIONS.filter((suggestionDefinition) => suggestionDefinition.surfaces.includes(surface));
  return (matched.length > 0 ? matched : AI_SUGGESTIONS.slice(0, 3)).slice(0, 4);
}

function suggestion(id: string, textKey: string, intent: AiIntentId, surfaces: AiSurface[]): AiSuggestionDefinition {
  return {
    id,
    textKey,
    intent,
    surfaces
  };
}
