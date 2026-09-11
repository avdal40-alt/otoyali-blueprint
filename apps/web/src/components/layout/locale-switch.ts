import { getLocaleSwitchPath, isSupportedLocale, LOCALE_COOKIE_NAME } from "@/i18n/config";

export function getLocationHref(pathname: string, query: string, hash: string) {
  return `${pathname}${query ? `?${query}` : ""}${hash}`;
}

/**
 * Persists a released locale before one document navigation so request-derived
 * locale state is available when the next document mounts.
 */
export function persistLocaleAndNavigate(nextLocale: string, currentHref: string) {
  if (!isSupportedLocale(nextLocale)) return false;

  document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
  window.location.assign(getLocaleSwitchPath(currentHref, nextLocale));
  return true;
}
