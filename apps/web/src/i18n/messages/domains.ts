/**
 * Domain names reserved for incremental message-file extraction. Existing
 * dictionaries remain a compatibility bridge in I18N-01 so no product copy is
 * rewritten as part of this foundation change.
 */
export const TRANSLATION_DOMAINS = [
  "common",
  "navigation",
  "auth",
  "home",
  "listings",
  "vehicle",
  "search",
  "filters",
  "seller",
  "favorites",
  "profile",
  "moderation",
  "errors",
  "validation",
  "seo"
] as const;

export type TranslationDomain = (typeof TRANSLATION_DOMAINS)[number];
