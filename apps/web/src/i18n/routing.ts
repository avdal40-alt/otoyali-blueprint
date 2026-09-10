import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from "./config";

/**
 * The next-intl routing foundation intentionally includes only released locales.
 * Turkish remains unprefixed; existing English URL localization remains handled
 * by the compatibility middleware until a dedicated route migration.
 */
export const routing = defineRouting({
  locales: SUPPORTED_LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "as-needed",
  localeDetection: false
});
