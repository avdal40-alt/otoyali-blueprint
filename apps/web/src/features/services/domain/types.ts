import type { IconName } from "@/components/ui/Icon";
import type { Locale } from "@/i18n/types";
import type { MarketplaceVerticalId } from "@/lib/marketplace/types";

export type ServiceCategoryId =
  | "periodic_maintenance"
  | "diagnostics"
  | "engine_repair"
  | "transmission"
  | "brakes"
  | "suspension"
  | "electrical"
  | "air_conditioning"
  | "tires"
  | "battery"
  | "oil_change"
  | "body_repair"
  | "paint"
  | "glass"
  | "detailing"
  | "car_wash"
  | "inspection"
  | "towing"
  | "ev_service"
  | "marine_service"
  | "commercial_vehicle_service"
  | "motorcycle_service"
  | "other";

export type ServiceProviderStatus = "draft" | "pending_review" | "active" | "suspended" | "rejected" | "archived";
export type ServiceBranchStatus = "draft" | "pending_review" | "active" | "temporarily_closed" | "suspended" | "archived";
export type ServiceOfferingStatus = "draft" | "pending_review" | "active" | "suspended" | "archived";
export type ServiceApplicationStatus = "pending_review" | "reviewing" | "approved" | "rejected" | "archived";
export type ServicePricingMode = "fixed" | "starting_from" | "range" | "quote_required" | "unavailable";
export type ServiceBookingMode = "request_only" | "instant_booking_future" | "contact_provider" | "unavailable";
export type ServiceCategoryAvailability = "available" | "preview" | "coming_soon" | "disabled";
export type ServiceBookingReadiness = "request_ready" | "planned" | "disabled";

export type ServiceCategoryDefinition = {
  id: ServiceCategoryId;
  labelKey: string;
  descriptionKey: string;
  seoSlug: string;
  iconName: IconName;
  supportedVerticals: MarketplaceVerticalId[];
  availability: ServiceCategoryAvailability;
  bookingReadiness: ServiceBookingReadiness;
  emergencyRelevant: boolean;
  sortOrder: number;
};

export type ServiceSpecializationId =
  | "passenger_cars"
  | "commercial_vehicles"
  | "motorcycles"
  | "marine"
  | "electric_vehicles"
  | "hybrid_vehicles"
  | "body_repair"
  | "tires"
  | "detailing"
  | "roadside_towing";

export type ServiceSpecializationDefinition = {
  id: ServiceSpecializationId;
  labelKey: string;
  descriptionKey: string;
  verticals: MarketplaceVerticalId[];
  categoryIds: ServiceCategoryId[];
};

export type ServiceProviderApplicationInput = {
  businessName: string;
  contactPersonName: string;
  contactPhone: string;
  city: string;
  district: string;
  categoryKeys: string[];
  supportedVerticals: MarketplaceVerticalId[];
  websiteUrl: string;
  notes: string;
  consentAccuracy: boolean;
};

export type NormalizedServiceProviderApplication = {
  business_name: string;
  contact_person_name: string;
  contact_phone: string;
  city: string;
  district: string | null;
  category_keys: ServiceCategoryId[];
  supported_verticals: MarketplaceVerticalId[];
  website_url: string | null;
  notes: string | null;
  consent_accuracy: boolean;
};

export type ServiceValidationField =
  | "businessName"
  | "contactPersonName"
  | "contactPhone"
  | "city"
  | "district"
  | "categoryKeys"
  | "supportedVerticals"
  | "websiteUrl"
  | "notes"
  | "consentAccuracy";

export type ServiceApplicationValidationResult =
  | {
      ok: true;
      data: NormalizedServiceProviderApplication;
      fieldErrors: Partial<Record<ServiceValidationField, string>>;
    }
  | {
      ok: false;
      data: null;
      fieldErrors: Partial<Record<ServiceValidationField, string>>;
    };

export type ServiceRouteLocale = Extract<Locale, "tr" | "en">;
