import { localizePath } from "@/i18n/config";
import type { Locale } from "@/i18n/types";
import type { MarketplaceVerticalId } from "./types";
import { canUseVerticalCapability, getMarketplaceVertical, resolveMarketplaceVertical } from "./verticals";

export function getPublishVerticalFromSearchParam(value?: string | string[] | null): MarketplaceVerticalId {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return resolveMarketplaceVertical(rawValue);
}

export function canPublishVertical(verticalId: MarketplaceVerticalId) {
  return canUseVerticalCapability(verticalId, "canPublish");
}

export function getPublishRouteForVertical(verticalId: MarketplaceVerticalId, locale: Locale) {
  if (verticalId === "cars") return localizePath("/sell", locale);
  return `${localizePath("/sell", locale)}?vertical=${encodeURIComponent(verticalId)}`;
}

export function getFallbackRouteForUnavailablePublish(verticalId: MarketplaceVerticalId, locale: Locale) {
  const vertical = getMarketplaceVertical(verticalId);
  return vertical.routes.tr === "/search" ? localizePath("/search", locale) : localizePath(vertical.routes.tr, locale);
}
