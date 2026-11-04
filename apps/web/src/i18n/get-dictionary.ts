import { en } from "./dictionaries/en";
import { tr } from "./dictionaries/tr";
import { DEFAULT_LOCALE, normalizeLocale } from "./config";
import { getGlobalLaunchHomeCopy } from "./global-launch-home-copy";
import { getGlobalLaunchSearchCopy } from "./global-launch-search-copy";
import { getGlobalLaunchSharedCopy } from "./global-launch-shared-copy";
import { getDealerPageValue } from "./dealer-page-copy";
import { getServicePageValue } from "./service-page-copy";
import { getVerticalPageValue } from "./vertical-page-copy";
import { getModerationRuntimeValue } from "./moderation-runtime-copy";
import { getInsurancePageValue } from "./insurance-page-copy";
import type { ClientDictionary, Dictionary, DictionarySection, Locale, TranslationParams } from "./types";

const dictionaries: Record<"tr" | "en", Dictionary> = {
  tr,
  en
};

const missingTranslationKeys = new Set<string>();

export const JOLMOD_DEFAULT_LOCALE = "ru";

export function getJolmodGlobalDictionary(locale?: string | null) {
  const resolvedLocale = locale === "kk" || locale === "en" || locale === "zh-CN" || locale === "ru"
    ? locale
    : JOLMOD_DEFAULT_LOCALE;
  const shared = getGlobalLaunchSharedCopy(resolvedLocale);
  const home = getGlobalLaunchHomeCopy(resolvedLocale);
  const search = getGlobalLaunchSearchCopy(resolvedLocale);
  if (!shared || !home || !search) throw new Error(`Missing Jolmod global dictionary for ${resolvedLocale}`);

  return { ...shared, ...home, ...search };
}

export function getDictionary(locale?: string | null): Dictionary {
  const normalizedLocale = normalizeLocale(locale);
  return dictionaries[normalizedLocale === "en" ? "en" : "tr"];
}

export function getClientDictionary(locale?: string | null): ClientDictionary {
  const dictionary = getDictionary(locale);
  const jolmodGlobal = getJolmodGlobalDictionary(locale);

  return {
    common: jolmodGlobal.common,
    navigation: jolmodGlobal.navigation,
    footer: jolmodGlobal.footer,
    home: jolmodGlobal.home,
    search: jolmodGlobal.search,
    listing: dictionary.listing,
    sell: dictionary.sell,
    profile: dictionary.profile,
    notifications: dictionary.notifications,
    messages: dictionary.messages,
    favorites: dictionary.favorites,
    myListings: dictionary.myListings,
    services: dictionary.services,
    admin: dictionary.admin,
    moderator: dictionary.moderator,
    auth: dictionary.auth,
    errors: dictionary.errors,
    validation: dictionary.validation,
    status: dictionary.status,
    verticals: dictionary.verticals,
    ai: dictionary.ai,
    format: dictionary.format
  };
}

export function t(locale: Locale | string | null | undefined, key: string, params?: TranslationParams) {
  const insuranceValue = getInsurancePageValue(locale, key);
  if (insuranceValue !== undefined) return interpolate(insuranceValue, params);
  const directValue = getDealerPageValue(locale, key);
  if (directValue !== undefined) return interpolate(directValue, params);
  const serviceValue = getServicePageValue(locale, key);
  if (serviceValue !== undefined) return interpolate(serviceValue, params);
  const verticalValue = getVerticalPageValue(locale, key);
  if (verticalValue !== undefined) return interpolate(verticalValue, params);
  const moderationValue = getModerationRuntimeValue(locale, key);
  if (moderationValue !== undefined) return interpolate(moderationValue, params);
  const dictionary = getDictionary(locale);
  const localizedValue = readKey(dictionary, key);
  const fallbackValue = readKey(dictionaries.tr, key);
  const value = localizedValue ?? fallbackValue;

  if (typeof value !== "string") {
    reportMissingTranslation(normalizeLocale(locale), key);
    return String(readKey(dictionaries.tr, "common.translationUnavailable") ?? "");
  }

  if (localizedValue === undefined) {
    reportMissingTranslation(normalizeLocale(locale), key);
  }

  return interpolate(value, params);
}

export function interpolate(value: string, params?: TranslationParams) {
  if (!params) return value;

  return value.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, paramKey) => {
    const replacement = params[paramKey];
    return replacement === null || replacement === undefined ? match : String(replacement);
  });
}

function readKey(dictionary: Dictionary | DictionarySection, key: string) {
  return key.split(".").reduce<unknown>((current, part) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as DictionarySection)[part];
  }, dictionary);
}

function reportMissingTranslation(locale: Locale, key: string) {
  const identifier = `${locale}:${key}`;
  if (missingTranslationKeys.has(identifier)) return;

  missingTranslationKeys.add(identifier);
  console.warn(`[i18n] Missing translation for ${identifier}; using the Turkish fallback.`);
}
