import { isInternalHref, localizePath, stripLocalePrefix } from "@/i18n/config";
import type { Locale } from "@/i18n/types";
import type { AiAction, AiActionType } from "./types";

const allowedActionTypes: AiActionType[] = [
  "navigate",
  "open_search",
  "apply_search_filters",
  "view_listing",
  "compare_listings",
  "open_sell",
  "open_trust_center",
  "login"
];

const allowedExactPaths = [
  "/",
  "/en",
  "/search",
  "/en/search",
  "/sell",
  "/en/sell",
  "/trust",
  "/en/trust",
  "/login",
  "/en/login",
  "/video",
  "/en/video",
  "/ticari-araclar",
  "/en/commercial-vehicles",
  "/deniz-araclari",
  "/en/marine-vehicles",
  "/yedek-parca",
  "/en/spare-parts",
  "/servisler",
  "/en/services",
  "/servisler/basvuru",
  "/en/services/apply",
  "/sigorta",
  "/en/insurance"
];

const allowedPathPrefixes = ["/listing/", "/en/listing/", "/servisler/", "/en/services/"];

const allowedQueryKeys = [
  "q",
  "make",
  "model",
  "city",
  "price_min",
  "price_max",
  "year_min",
  "year_max",
  "max_mileage",
  "fuel_type",
  "transmission",
  "body_type",
  "drive_type",
  "color",
  "condition",
  "seller_type",
  "sort",
  "advanced",
  "vertical",
  "category",
  "district",
  "next"
];

export function createAssistantAction(type: AiActionType, label: string, href: string, locale: Locale): AiAction | null {
  return normalizeAssistantAction({ type, label, href: localizePath(href, locale) });
}

export function normalizeAssistantActions(actions?: AiAction[]) {
  return (actions ?? []).map(normalizeAssistantAction).filter((action): action is AiAction => Boolean(action));
}

export function normalizeAssistantAction(action: AiAction): AiAction | null {
  if (!allowedActionTypes.includes(action.type)) return null;
  const href = normalizeInternalHref(action.href);
  if (!href) return null;
  const label = action.label.trim().slice(0, 80);
  if (!label) return null;
  return { type: action.type, label, href };
}

export function normalizeInternalHref(href: string) {
  if (!isInternalHref(href)) return null;

  let url: URL;
  try {
    url = new URL(href, "https://otoyali.local");
  } catch {
    return null;
  }

  if (!isAllowedPath(url.pathname)) return null;

  const params = new URLSearchParams();
  for (const [key, value] of url.searchParams.entries()) {
    if (allowedQueryKeys.includes(key) && value.length <= 120) {
      params.append(key, value);
    }
  }

  const query = params.toString();
  return `${url.pathname}${query ? `?${query}` : ""}${url.hash && url.hash.length <= 80 ? url.hash : ""}`;
}

function isAllowedPath(pathname: string) {
  const stripped = stripLocalePrefix(pathname).pathname;
  if (stripped === "/") return true;
  return (allowedExactPaths.includes(pathname) || allowedPathPrefixes.some((prefix) => pathname.startsWith(prefix))) && !stripped.startsWith("/admin");
}
