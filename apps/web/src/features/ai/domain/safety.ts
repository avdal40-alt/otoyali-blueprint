import type { AiContext, AiResponse, AiWarningCode } from "./types";

export const AI_SAFETY_POLICY_RULES = [
  "Do not invent listing facts.",
  "Do not invent vehicle history.",
  "Do not claim access to TRAMER, VIN, seller verification, or market-wide pricing databases.",
  "Do not guarantee that a vehicle is safe, fairly priced, legally clean, or mechanically sound.",
  "Do not expose private seller, profile, moderation, token, or admin data.",
  "Do not provide legal certification, mechanical diagnosis, insurance quotes, or financial guarantees.",
  "Do not help bypass marketplace security, moderation, payment, or contact protections."
] as const;

const allowedWarnings: AiWarningCode[] = [
  "informational_only",
  "verify_independently",
  "incomplete_data",
  "provider_unavailable",
  "feature_not_connected"
];

export function sanitizeAssistantContext(context: AiContext): AiContext {
  return {
    surface: context.surface,
    locale: context.locale,
    vertical: context.vertical,
    currentRoute: context.currentRoute,
    listing: context.listing
      ? {
          listingId: context.listing.listingId,
          vertical: context.listing.vertical,
          title: cleanOptionalText(context.listing.title, 120),
          priceAmount: typeof context.listing.priceAmount === "number" ? context.listing.priceAmount : null,
          currency: cleanOptionalText(context.listing.currency, 8),
          make: cleanOptionalText(context.listing.make, 60),
          model: cleanOptionalText(context.listing.model, 80),
          year: typeof context.listing.year === "number" ? context.listing.year : null,
          mileageKm: typeof context.listing.mileageKm === "number" ? context.listing.mileageKm : null,
          fuel: cleanOptionalText(context.listing.fuel, 40),
          transmission: cleanOptionalText(context.listing.transmission, 40),
          city: cleanOptionalText(context.listing.city, 60),
          sellerType: cleanOptionalText(context.listing.sellerType, 40),
          status: cleanOptionalText(context.listing.status, 40),
          descriptionExcerpt: cleanOptionalText(context.listing.descriptionExcerpt, 280)
        }
      : undefined,
    search: context.search
      ? {
          query: cleanOptionalText(context.search.query, 120),
          make: cleanOptionalText(context.search.make, 60),
          model: cleanOptionalText(context.search.model, 80),
          city: cleanOptionalText(context.search.city, 60),
          condition: cleanOptionalText(context.search.condition, 40)
        }
      : undefined,
    publishing: context.publishing
      ? {
          vertical: context.publishing.vertical,
          step: cleanOptionalText(context.publishing.step, 80),
          hasPhotos: typeof context.publishing.hasPhotos === "boolean" ? context.publishing.hasPhotos : null
        }
      : undefined,
    service: context.service
      ? {
          category: cleanOptionalText(context.service.category, 80),
          providerSlug: cleanOptionalText(context.service.providerSlug, 100),
          city: cleanOptionalText(context.service.city, 80),
          district: cleanOptionalText(context.service.district, 80)
        }
      : undefined,
    userState: context.userState
      ? {
          authenticated: Boolean(context.userState.authenticated),
          role: context.userState.role === "admin" ? "admin" : context.userState.role === "user" ? "user" : "guest"
        }
      : undefined,
    sellerType: cleanOptionalText(context.sellerType, 40)
  };
}

export function getDefaultWarnings(status: AiResponse["status"]): AiWarningCode[] {
  if (status === "unavailable") return ["provider_unavailable", "feature_not_connected"];
  if (status === "unsupported") return ["feature_not_connected", "informational_only"];
  return ["informational_only", "verify_independently"];
}

export function normalizeWarnings(warnings?: AiWarningCode[]): AiWarningCode[] {
  const normalized = (warnings ?? []).filter((warning) => allowedWarnings.includes(warning));
  return normalized.length > 0 ? Array.from(new Set(normalized)) : ["informational_only"];
}

export function cleanOptionalText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned.slice(0, maxLength);
}

export function truncateAssistantText(value: string, maxLength: number) {
  const cleaned = value.replace(/\s+/g, " ").trim();
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}…` : cleaned;
}
