import type { Locale } from "@/i18n/types";

const searchResultsMessages: Record<Locale, (count: number) => string> = {
  tr: (count) => `${count} ilan bulundu.`,
  en: (count) => `${count} listings found.`
};

export function getAiSearchResultsMessage(locale: Locale, count: number) {
  return searchResultsMessages[locale](count);
}
