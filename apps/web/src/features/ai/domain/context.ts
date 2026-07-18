import { englishPathToTurkishPath, stripLocalePrefix } from "@/i18n/config";
import type { Locale } from "@/i18n/types";
import type { MarketplaceVerticalId } from "@/lib/marketplace/types";
import {
  DEFAULT_MARKETPLACE_VERTICAL,
  getVerticalByTurkishPath,
  resolveMarketplaceVertical
} from "@/lib/marketplace/verticals";
import type { AiContext, AiSurface, AiUserState } from "./types";

const assistantHiddenPrefixes = [
  "/admin",
  "/auth",
  "/debug",
  "/login",
  "/otp",
  "/settings",
  "/profile",
  "/favorites",
  "/my-listings",
  "/notifications"
];

export function shouldShowAssistantForPath(pathname: string) {
  const internalPath = toInternalTurkishPath(pathname);
  return !assistantHiddenPrefixes.some((prefix) => internalPath === prefix || internalPath.startsWith(`${prefix}/`));
}

export function resolveAiSurface(pathname: string): AiSurface {
  const internalPath = toInternalTurkishPath(pathname);

  if (internalPath === "/") return "home";
  if (internalPath.startsWith("/search")) return "search";
  if (internalPath.startsWith("/listing/")) return "listing_detail";
  if (internalPath.startsWith("/sell")) return "sell";
  if (internalPath.startsWith("/profile")) return "profile";
  if (internalPath.startsWith("/favorites")) return "favorites";
  if (internalPath.startsWith("/video")) return "video";
  if (internalPath === "/servisler" || internalPath === "/servisler/basvuru") return "service_marketplace";
  if (internalPath.startsWith("/servisler/")) return "service_provider";
  if (internalPath.startsWith("/trust")) return "trust";
  if (internalPath.startsWith("/admin")) return "admin";
  if (getVerticalByTurkishPath(internalPath)) return "vertical_landing";

  return "global";
}

export function resolveAiVertical(pathname: string, explicitVertical?: string | null): MarketplaceVerticalId {
  if (explicitVertical) return resolveMarketplaceVertical(explicitVertical);
  const internalPath = toInternalTurkishPath(pathname);
  const vertical = getVerticalByTurkishPath(internalPath);
  return vertical?.id ?? DEFAULT_MARKETPLACE_VERTICAL;
}

export function buildAssistantContext({
  locale,
  pathname,
  searchParams,
  userState
}: {
  locale: Locale;
  pathname: string;
  searchParams?: URLSearchParams;
  userState?: AiUserState;
}): AiContext {
  const vertical = resolveAiVertical(pathname, searchParams?.get("vertical"));
  const surface = resolveAiSurface(pathname);
  const context: AiContext = {
    surface,
    locale,
    vertical,
    currentRoute: buildSafeCurrentRoute(pathname, searchParams),
    userState: userState ?? { authenticated: false, role: "guest" }
  };

  if (surface === "listing_detail") {
    const listingId = getListingIdFromPath(pathname);
    if (listingId) {
      context.listing = {
        listingId,
        vertical
      };
    }
  }

  if (surface === "search") {
    context.search = {
      query: searchParams?.get("q"),
      make: searchParams?.get("make"),
      model: searchParams?.get("model"),
      city: searchParams?.get("city"),
      condition: searchParams?.get("condition")
    };
  }

  if (surface === "sell") {
    context.publishing = {
      vertical
    };
  }

  if (surface === "service_marketplace" || surface === "service_provider") {
    context.service = {
      category: searchParams?.get("category"),
      providerSlug: surface === "service_provider" ? getServiceProviderSlugFromPath(pathname) : null,
      city: searchParams?.get("city"),
      district: searchParams?.get("district")
    };
  }

  return context;
}

function buildSafeCurrentRoute(pathname: string, searchParams?: URLSearchParams) {
  const query = new URLSearchParams();
  const allowedKeys = ["q", "make", "model", "city", "condition", "vertical", "category", "district"];

  for (const key of allowedKeys) {
    const values = searchParams?.getAll(key) ?? [];
    for (const value of values) {
      if (value.length <= 120) query.append(key, value);
    }
  }

  const serialized = query.toString();
  return `${pathname}${serialized ? `?${serialized}` : ""}`;
}

function getListingIdFromPath(pathname: string) {
  const internalPath = toInternalTurkishPath(pathname);
  const [, , id] = internalPath.split("/");
  return id?.trim() || null;
}

function getServiceProviderSlugFromPath(pathname: string) {
  const internalPath = toInternalTurkishPath(pathname);
  const [, , slug] = internalPath.split("/");
  return slug?.trim() || null;
}

function toInternalTurkishPath(pathname: string) {
  const { pathname: stripped } = stripLocalePrefix(pathname);
  return englishPathToTurkishPath(stripped);
}
