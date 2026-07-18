import { isMarketplaceVerticalId } from "@/lib/marketplace/verticals";
import { isServiceCategoryId } from "./categories";
import type {
  NormalizedServiceProviderApplication,
  ServiceApplicationValidationResult,
  ServiceProviderApplicationInput,
  ServiceValidationField
} from "./types";

const maxLengths: Record<Exclude<ServiceValidationField, "categoryKeys" | "supportedVerticals" | "consentAccuracy">, number> = {
  businessName: 160,
  contactPersonName: 120,
  contactPhone: 32,
  city: 80,
  district: 80,
  websiteUrl: 240,
  notes: 1600
};

export function validateServiceProviderApplication(input: ServiceProviderApplicationInput): ServiceApplicationValidationResult {
  const errors: Partial<Record<ServiceValidationField, string>> = {};
  const businessName = normalizeWhitespace(input.businessName);
  const contactPersonName = normalizeWhitespace(input.contactPersonName);
  const contactPhone = normalizeWhitespace(input.contactPhone);
  const city = normalizeWhitespace(input.city);
  const district = normalizeWhitespace(input.district);
  const notes = normalizeWhitespace(input.notes);
  const websiteUrl = normalizeWebsiteUrl(input.websiteUrl);
  const categoryKeys = Array.from(new Set(input.categoryKeys.filter(isServiceCategoryId)));
  const supportedVerticals = Array.from(new Set(input.supportedVerticals.filter(isMarketplaceVerticalId)));

  if (businessName.length < 2) errors.businessName = "services.validation.businessNameRequired";
  if (businessName.length > maxLengths.businessName) errors.businessName = "services.validation.tooLong";
  if (contactPersonName.length < 2) errors.contactPersonName = "services.validation.contactNameRequired";
  if (contactPersonName.length > maxLengths.contactPersonName) errors.contactPersonName = "services.validation.tooLong";
  if (!isValidPhone(contactPhone)) errors.contactPhone = "services.validation.phoneInvalid";
  if (city.length < 2) errors.city = "services.validation.cityRequired";
  if (city.length > maxLengths.city) errors.city = "services.validation.tooLong";
  if (district.length > maxLengths.district) errors.district = "services.validation.tooLong";
  if (categoryKeys.length === 0) errors.categoryKeys = "services.validation.categoryRequired";
  if (supportedVerticals.length === 0) errors.supportedVerticals = "services.validation.verticalRequired";
  if (input.websiteUrl.trim() && !websiteUrl) errors.websiteUrl = "services.validation.websiteInvalid";
  if (notes.length > maxLengths.notes) errors.notes = "services.validation.tooLong";
  if (!input.consentAccuracy) errors.consentAccuracy = "services.validation.consentRequired";

  if (Object.keys(errors).length > 0) {
    return { ok: false, data: null, fieldErrors: errors };
  }

  return {
    ok: true,
    data: {
      business_name: businessName,
      contact_person_name: contactPersonName,
      contact_phone: contactPhone,
      city,
      district: district || null,
      category_keys: categoryKeys,
      supported_verticals: supportedVerticals,
      website_url: websiteUrl,
      notes: notes || null,
      consent_accuracy: true
    } satisfies NormalizedServiceProviderApplication,
    fieldErrors: {}
  };
}

export function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizeWebsiteUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "https:") return null;
    if (!url.hostname || url.hostname.length > 180) return null;
    url.username = "";
    url.password = "";
    url.hash = "";
    const normalized = url.toString();
    return normalized.length <= maxLengths.websiteUrl ? normalized : null;
  } catch {
    return null;
  }
}

function isValidPhone(value: string) {
  const compact = value.replace(/[\s().-]/g, "");
  return /^\+?[0-9]{8,15}$/.test(compact);
}
