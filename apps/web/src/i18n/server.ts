import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, LOCALE_HEADER_NAME, normalizeLocale } from "./config";
import type { Locale } from "./types";

export function getRequestLocale(): Locale {
  const headerLocale = headers().get(LOCALE_HEADER_NAME);
  if (headerLocale) return normalizeLocale(headerLocale);

  const cookieLocale = cookies().get(LOCALE_COOKIE_NAME)?.value;
  if (cookieLocale) return normalizeLocale(cookieLocale);

  return DEFAULT_LOCALE;
}
