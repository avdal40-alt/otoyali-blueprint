import type { Locale } from "@/i18n/types";
import type { MarketplaceVerticalId } from "@/lib/marketplace/types";

export type AiProviderId = "local" | "disabled";

export type AiResponseStatus =
  | "success"
  | "unavailable"
  | "unsupported"
  | "needs_clarification"
  | "blocked"
  | "error";

export type AiCapabilityId =
  | "assistant_chat"
  | "natural_language_search"
  | "listing_explanation"
  | "vehicle_comparison"
  | "price_interpretation"
  | "listing_copy_improvement"
  | "publishing_assistance"
  | "trust_guidance"
  | "ownership_assistance";

export type AiCapabilityLifecycle = "available" | "local_preview" | "planned" | "disabled";

export type AiIntentId =
  | "general_help"
  | "search_vehicles"
  | "compare_vehicles"
  | "explain_listing"
  | "interpret_price"
  | "improve_listing"
  | "publishing_help"
  | "trust_and_safety"
  | "ownership_guidance"
  | "unsupported";

export type AiSafetyCategory =
  | "general"
  | "marketplace_guidance"
  | "price_guidance"
  | "trust_guidance"
  | "publishing_guidance"
  | "ownership_guidance";

export type AiSurface =
  | "global"
  | "home"
  | "search"
  | "listing_detail"
  | "sell"
  | "profile"
  | "favorites"
  | "video"
  | "vertical_landing"
  | "trust"
  | "admin";

export type AiUserState = {
  authenticated: boolean;
  role: "guest" | "user" | "admin";
};

export type AiConversationMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

export type AiPublicListingContext = {
  listingId: string;
  vertical: MarketplaceVerticalId;
  title?: string | null;
  priceAmount?: number | null;
  currency?: string | null;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  mileageKm?: number | null;
  fuel?: string | null;
  transmission?: string | null;
  city?: string | null;
  sellerType?: string | null;
  status?: string | null;
  descriptionExcerpt?: string | null;
};

export type AiSearchContext = {
  query?: string | null;
  make?: string | null;
  model?: string | null;
  city?: string | null;
  condition?: string | null;
};

export type AiPublishingContext = {
  vertical: MarketplaceVerticalId;
  step?: string | null;
  hasPhotos?: boolean | null;
};

export type AiContext = {
  surface: AiSurface;
  locale: Locale;
  vertical: MarketplaceVerticalId;
  currentRoute?: string;
  listing?: AiPublicListingContext;
  search?: AiSearchContext;
  publishing?: AiPublishingContext;
  userState?: AiUserState;
  sellerType?: string | null;
};

export type AiRequest = {
  requestId: string;
  locale: Locale;
  intent: AiIntentId;
  userMessage: string;
  conversation: AiConversationMessage[];
  context: AiContext;
  vertical: MarketplaceVerticalId;
  surface: AiSurface;
  userState: AiUserState;
  metadata: {
    userAgent?: string;
    contentLength?: number;
  };
};

export type AiWarningCode =
  | "informational_only"
  | "verify_independently"
  | "incomplete_data"
  | "provider_unavailable"
  | "feature_not_connected";

export type AiCitation = {
  label: string;
  href?: string;
};

export type AiActionType =
  | "navigate"
  | "open_search"
  | "apply_search_filters"
  | "view_listing"
  | "compare_listings"
  | "open_sell"
  | "open_trust_center"
  | "login";

export type AiAction = {
  type: AiActionType;
  label: string;
  href: string;
};

export type AiChecklistItem = {
  id: string;
  label: string;
  status: "guidance" | "future" | "unavailable";
};

export type AiStructuredData =
  | {
      type: "assistant_intro";
      capabilities: AiCapabilityId[];
    }
  | {
      type: "search_guidance";
      filters: string[];
    }
  | {
      type: "publishing_checklist";
      items: AiChecklistItem[];
    }
  | {
      type: "trust_checklist";
      items: AiChecklistItem[];
    };

export type AiResponse = {
  requestId: string;
  status: AiResponseStatus;
  message: string;
  structuredData?: AiStructuredData[];
  suggestions?: string[];
  actions?: AiAction[];
  citations?: AiCitation[];
  warnings?: AiWarningCode[];
  confidence?: number;
  provider: AiProviderId;
  latencyMs: number;
  error?: {
    code: string;
    message: string;
  };
};
