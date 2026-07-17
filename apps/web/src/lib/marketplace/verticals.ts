import { localizePath } from "@/i18n/config";
import type { Locale } from "@/i18n/types";
import type {
  MarketplaceCapability,
  MarketplaceVerticalConfig,
  MarketplaceVerticalId
} from "./types";

const allCapabilities: MarketplaceCapability[] = [
  "canBrowse",
  "canSearch",
  "canPublish",
  "canFavorite",
  "canSaveSearch",
  "canContactSeller",
  "canUploadImages",
  "canUploadVideo",
  "supportsDigitalTwin",
  "supportsPrice",
  "supportsLocation",
  "supportsCondition",
  "supportsSellerProfile",
  "requiresModeration",
  "supportsSEO",
  "supportsAttributes",
  "supportsInventory"
];

const disabledCapabilities = Object.fromEntries(allCapabilities.map((capability) => [capability, false])) as Record<MarketplaceCapability, boolean>;
const activeCarCapabilities: Record<MarketplaceCapability, boolean> = {
  canBrowse: true,
  canSearch: true,
  canPublish: true,
  canFavorite: true,
  canSaveSearch: true,
  canContactSeller: true,
  canUploadImages: true,
  canUploadVideo: true,
  supportsDigitalTwin: true,
  supportsPrice: true,
  supportsLocation: true,
  supportsCondition: true,
  supportsSellerProfile: true,
  requiresModeration: true,
  supportsSEO: true,
  supportsAttributes: true,
  supportsInventory: true
};

const plannedMarketplaceCapabilities: Record<MarketplaceCapability, boolean> = {
  ...disabledCapabilities,
  supportsSEO: true,
  supportsAttributes: true,
  supportsSellerProfile: true,
  requiresModeration: true
};

export const MARKETPLACE_VERTICALS = [
  vertical({
    id: "cars",
    routeSegment: "cars",
    trPath: "/search",
    enPath: "/en/search",
    icon: "car",
    status: "active",
    featuredOnHome: true,
    seoIndexable: true,
    searchEnabled: true,
    publishEnabled: true,
    listingEnabled: true,
    supportedSellerTypes: ["private", "dealer"],
    supportedMediaTypes: ["image", "video"],
    capabilityDefaults: activeCarCapabilities,
    featureFlags: ["cars.marketplace.active", "cars.publish.active"],
    highlightKeys: [
      "verticals.cars.highlights.search",
      "verticals.cars.highlights.publish",
      "verticals.cars.highlights.video"
    ],
    relatedVerticalIds: ["commercial", "parts", "insurance"]
  }),
  vertical({
    id: "commercial",
    routeSegment: "ticari-araclar",
    trPath: "/ticari-araclar",
    enPath: "/en/commercial-vehicles",
    icon: "truck",
    status: "coming_soon",
    featuredOnHome: true,
    seoIndexable: true,
    supportedSellerTypes: ["private", "dealer"],
    supportedMediaTypes: ["image", "video"],
    featureFlags: ["commercial.preview"],
    highlightKeys: [
      "verticals.commercial.highlights.lightCommercial",
      "verticals.commercial.highlights.trucks",
      "verticals.commercial.highlights.machinery"
    ],
    relatedVerticalIds: ["cars", "services", "insurance"]
  }),
  vertical({
    id: "marine",
    routeSegment: "deniz-araclari",
    trPath: "/deniz-araclari",
    enPath: "/en/marine-vehicles",
    icon: "ship",
    status: "coming_soon",
    featuredOnHome: true,
    seoIndexable: true,
    supportedSellerTypes: ["private", "dealer"],
    supportedMediaTypes: ["image", "video"],
    featureFlags: ["marine.preview"],
    highlightKeys: [
      "verticals.marine.highlights.boats",
      "verticals.marine.highlights.yachts",
      "verticals.marine.highlights.engines"
    ],
    relatedVerticalIds: ["cars", "insurance", "services"]
  }),
  vertical({
    id: "parts",
    routeSegment: "yedek-parca",
    trPath: "/yedek-parca",
    enPath: "/en/spare-parts",
    icon: "parts",
    status: "coming_soon",
    featuredOnHome: true,
    seoIndexable: true,
    supportedSellerTypes: ["private", "dealer"],
    supportedMediaTypes: ["image"],
    featureFlags: ["parts.preview"],
    highlightKeys: [
      "verticals.parts.highlights.tires",
      "verticals.parts.highlights.body",
      "verticals.parts.highlights.electronics"
    ],
    relatedVerticalIds: ["cars", "services", "commercial"]
  }),
  vertical({
    id: "services",
    routeSegment: "servisler",
    trPath: "/servisler",
    enPath: "/en/services",
    icon: "service",
    status: "coming_soon",
    featuredOnHome: true,
    seoIndexable: true,
    supportedSellerTypes: ["service_provider"],
    supportedMediaTypes: ["image"],
    featureFlags: ["services.preview"],
    highlightKeys: [
      "verticals.services.highlights.inspection",
      "verticals.services.highlights.maintenance",
      "verticals.services.highlights.evService"
    ],
    relatedVerticalIds: ["cars", "parts", "insurance"]
  }),
  vertical({
    id: "insurance",
    routeSegment: "sigorta",
    trPath: "/sigorta",
    enPath: "/en/insurance",
    icon: "shield",
    status: "coming_soon",
    featuredOnHome: true,
    seoIndexable: true,
    supportedSellerTypes: ["insurer"],
    supportedMediaTypes: ["document"],
    featureFlags: ["insurance.preview"],
    highlightKeys: [
      "verticals.insurance.highlights.traffic",
      "verticals.insurance.highlights.casco",
      "verticals.insurance.highlights.claims"
    ],
    relatedVerticalIds: ["cars", "commercial", "services"]
  }),
  vertical({
    id: "motorcycles",
    routeSegment: "motorcycles",
    trPath: "/motosikletler",
    enPath: "/en/motorcycles",
    icon: "motorcycle",
    status: "disabled",
    featuredOnHome: false,
    seoIndexable: false,
    supportedSellerTypes: ["private", "dealer"],
    supportedMediaTypes: ["image", "video"],
    featureFlags: ["motorcycles.future"],
    highlightKeys: [],
    relatedVerticalIds: ["cars", "mobility"]
  }),
  vertical({
    id: "machinery",
    routeSegment: "machinery",
    trPath: "/is-makineleri",
    enPath: "/en/machinery",
    icon: "machinery",
    status: "disabled",
    featuredOnHome: false,
    seoIndexable: false,
    supportedSellerTypes: ["private", "dealer"],
    supportedMediaTypes: ["image", "video"],
    featureFlags: ["machinery.future"],
    highlightKeys: [],
    relatedVerticalIds: ["commercial"]
  }),
  vertical({
    id: "mobility",
    routeSegment: "mobility",
    trPath: "/mobilite-urunleri",
    enPath: "/en/mobility-products",
    icon: "mobility",
    status: "disabled",
    featuredOnHome: false,
    seoIndexable: false,
    supportedSellerTypes: ["private", "dealer"],
    supportedMediaTypes: ["image"],
    featureFlags: ["mobility.future"],
    highlightKeys: [],
    relatedVerticalIds: ["cars", "motorcycles"]
  })
] as const satisfies readonly MarketplaceVerticalConfig[];

export const MARKETPLACE_VERTICAL_IDS = MARKETPLACE_VERTICALS.map((vertical) => vertical.id);
export const DEFAULT_MARKETPLACE_VERTICAL: MarketplaceVerticalId = "cars";

export function getMarketplaceVertical(id: MarketplaceVerticalId) {
  return MARKETPLACE_VERTICALS.find((vertical) => vertical.id === id) ?? MARKETPLACE_VERTICALS[0];
}

export function isMarketplaceVerticalId(value?: string | null): value is MarketplaceVerticalId {
  return MARKETPLACE_VERTICALS.some((vertical) => vertical.id === value);
}

export function resolveMarketplaceVertical(value?: string | null): MarketplaceVerticalId {
  return isMarketplaceVerticalId(value) ? value : DEFAULT_MARKETPLACE_VERTICAL;
}

export function getVerticalByTurkishPath(pathname: string) {
  return MARKETPLACE_VERTICALS.find((vertical) => vertical.routes.tr === pathname);
}

export function getHomeFeaturedVerticals() {
  return MARKETPLACE_VERTICALS.filter((vertical) => vertical.featuredOnHome && vertical.status !== "disabled");
}

export function getSitemapVerticals() {
  return MARKETPLACE_VERTICALS.filter((vertical) => vertical.seoIndexable && vertical.status !== "disabled");
}

export function getVerticalPath(vertical: MarketplaceVerticalConfig, locale: Locale) {
  return locale === "en" ? vertical.routes.en : localizePath(vertical.routes.tr, locale);
}

export function getVerticalStatus(vertical: MarketplaceVerticalId | MarketplaceVerticalConfig) {
  return typeof vertical === "string" ? getMarketplaceVertical(vertical).status : vertical.status;
}

export function isVerticalEnabled(vertical: MarketplaceVerticalId | MarketplaceVerticalConfig) {
  return getVerticalStatus(vertical) === "active" || getVerticalStatus(vertical) === "preview";
}

export function canUseVerticalCapability(vertical: MarketplaceVerticalId | MarketplaceVerticalConfig, capability: MarketplaceCapability) {
  const config = typeof vertical === "string" ? getMarketplaceVertical(vertical) : vertical;
  return Boolean(config.capabilityDefaults[capability]);
}

function vertical(
  config: Omit<
    MarketplaceVerticalConfig,
    | "routes"
    | "labelKey"
    | "shortLabelKey"
    | "descriptionKey"
    | "shortDescriptionKey"
    | "seoTitleKey"
    | "seoDescriptionKey"
    | "searchEnabled"
    | "publishEnabled"
    | "listingEnabled"
    | "capabilityDefaults"
    | "attributeConfigId"
  > & {
    trPath: string;
    enPath: string;
    searchEnabled?: boolean;
    publishEnabled?: boolean;
    listingEnabled?: boolean;
    capabilityDefaults?: Record<MarketplaceCapability, boolean>;
  }
): MarketplaceVerticalConfig {
  const capabilities = config.capabilityDefaults ?? plannedMarketplaceCapabilities;

  return {
    id: config.id,
    routeSegment: config.routeSegment,
    routes: {
      tr: config.trPath,
      en: config.enPath,
      futureSearch: `/marketplace/${config.id}/search`,
      futureSell: `/marketplace/${config.id}/sell`,
      futureListing: `/marketplace/${config.id}/listing/[id]`
    },
    labelKey: `verticals.${config.id}.label`,
    shortLabelKey: `verticals.${config.id}.shortLabel`,
    descriptionKey: `verticals.${config.id}.description`,
    shortDescriptionKey: `verticals.${config.id}.shortDescription`,
    seoTitleKey: `verticals.${config.id}.seoTitle`,
    seoDescriptionKey: `verticals.${config.id}.seoDescription`,
    icon: config.icon,
    status: config.status,
    featuredOnHome: config.featuredOnHome,
    seoIndexable: config.seoIndexable,
    searchEnabled: config.searchEnabled ?? capabilities.canSearch,
    publishEnabled: config.publishEnabled ?? capabilities.canPublish,
    listingEnabled: config.listingEnabled ?? capabilities.supportsInventory,
    supportedSellerTypes: config.supportedSellerTypes,
    supportedMediaTypes: config.supportedMediaTypes,
    capabilityDefaults: capabilities,
    attributeConfigId: config.id,
    featureFlags: config.featureFlags,
    highlightKeys: config.highlightKeys,
    relatedVerticalIds: config.relatedVerticalIds
  };
}
