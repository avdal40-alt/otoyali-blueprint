export type MarketplaceVerticalId =
  | "cars"
  | "commercial"
  | "marine"
  | "parts"
  | "services"
  | "insurance"
  | "motorcycles"
  | "machinery"
  | "mobility";

export type MarketplaceVerticalStatus = "active" | "preview" | "coming_soon" | "disabled";

export type MarketplaceCapability =
  | "canBrowse"
  | "canSearch"
  | "canPublish"
  | "canFavorite"
  | "canSaveSearch"
  | "canContactSeller"
  | "canUploadImages"
  | "canUploadVideo"
  | "supportsDigitalTwin"
  | "supportsPrice"
  | "supportsLocation"
  | "supportsCondition"
  | "supportsSellerProfile"
  | "requiresModeration"
  | "supportsSEO"
  | "supportsAttributes"
  | "supportsInventory";

export type MarketplaceSellerType = "private" | "dealer" | "service_provider" | "insurer";
export type MarketplaceMediaType = "image" | "video" | "document";

export type MarketplaceRouteConfig = {
  tr: string;
  en: string;
  futureSearch?: string;
  futureSell?: string;
  futureListing?: string;
};

export type MarketplaceVerticalIcon =
  | "car"
  | "truck"
  | "ship"
  | "parts"
  | "service"
  | "shield"
  | "motorcycle"
  | "machinery"
  | "mobility";

export type MarketplaceVerticalConfig = {
  id: MarketplaceVerticalId;
  routeSegment: string;
  routes: MarketplaceRouteConfig;
  labelKey: string;
  shortLabelKey: string;
  descriptionKey: string;
  shortDescriptionKey: string;
  seoTitleKey: string;
  seoDescriptionKey: string;
  icon: MarketplaceVerticalIcon;
  status: MarketplaceVerticalStatus;
  featuredOnHome: boolean;
  seoIndexable: boolean;
  searchEnabled: boolean;
  publishEnabled: boolean;
  listingEnabled: boolean;
  supportedSellerTypes: MarketplaceSellerType[];
  supportedMediaTypes: MarketplaceMediaType[];
  capabilityDefaults: Record<MarketplaceCapability, boolean>;
  attributeConfigId: MarketplaceVerticalId;
  featureFlags: string[];
  highlightKeys: string[];
  relatedVerticalIds: MarketplaceVerticalId[];
};

export type MarketplacePrice = {
  amount: number | null;
  currency: string;
  negotiable?: boolean;
};

export type MarketplaceLocation = {
  country?: string | null;
  city?: string | null;
  district?: string | null;
};

export type MarketplaceSellerSummary = {
  id: string | null;
  displayName?: string | null;
  sellerType?: MarketplaceSellerType | string | null;
  city?: string | null;
};

export type MarketplaceMedia = {
  id?: string | null;
  url?: string | null;
  storagePath?: string | null;
  alt?: string | null;
  mediaType: MarketplaceMediaType;
  isCover?: boolean;
};

export type MarketplaceStatus = "draft" | "pending_review" | "active" | "paused" | "removed" | "sold";
export type MarketplaceModerationStatus = "active" | "pending_review" | "rejected" | "archived";

export type MarketplaceListingSummary<TAttributes = unknown> = {
  id: string;
  vertical: MarketplaceVerticalId;
  title: string;
  price?: MarketplacePrice | null;
  location?: MarketplaceLocation | null;
  primaryMedia?: MarketplaceMedia | null;
  seller?: MarketplaceSellerSummary | null;
  status: MarketplaceStatus | string;
  moderationStatus?: MarketplaceModerationStatus | string | null;
  createdAt?: string | null;
  publishedAt?: string | null;
  attributes?: TAttributes;
};

export type MarketplaceListingDetail<TAttributes = unknown> = MarketplaceListingSummary<TAttributes> & {
  description?: string | null;
  media?: MarketplaceMedia[];
};

export type MarketplaceFilterDefinition = {
  id: string;
  labelKey: string;
  type: "text" | "select" | "multi_select" | "number_range" | "boolean";
  queryParam: string;
  supportedVerticals: MarketplaceVerticalId[];
};

export type MarketplaceAttributeDefinition = {
  id: string;
  labelKey: string;
  valueType: "text" | "number" | "boolean" | "select" | "multi_select";
  requiredForPublish: boolean;
  filterable: boolean;
  comparable: boolean;
};

export type MarketplaceSearchRequest = {
  vertical: MarketplaceVerticalId;
  query?: string;
  filters: Record<string, string | string[] | number | boolean | null | undefined>;
  sort?: string;
  page?: number;
};
