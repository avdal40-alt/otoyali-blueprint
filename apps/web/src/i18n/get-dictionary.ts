import { en } from "./dictionaries/en";
import { tr } from "./dictionaries/tr";
import { DEFAULT_LOCALE, normalizeLocale } from "./config";
import type { ClientDictionary, Dictionary, DictionarySection, Locale, TranslationParams } from "./types";

const dictionaries: Record<"tr" | "en", Dictionary> = {
  tr,
  en
};

const missingTranslationKeys = new Set<string>();

export function getDictionary(locale?: string | null): Dictionary {
  const normalizedLocale = normalizeLocale(locale);
  return dictionaries[normalizedLocale] ?? dictionaries[DEFAULT_LOCALE];
}

export function getClientDictionary(locale?: string | null): ClientDictionary {
  const dictionary = getDictionary(locale);

  return {
    common: dictionary.common,
    navigation: dictionary.navigation,
    footer: dictionary.footer,
    home: dictionary.home,
    search: dictionary.search,
    listing: dictionary.listing,
    sell: dictionary.sell,
    profile: dictionary.profile,
    favorites: dictionary.favorites,
    myListings: dictionary.myListings,
    services: dictionary.services,
    admin: dictionary.admin,
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
  const dictionary = getDictionary(locale);
  const localizedValue = readKey(dictionary, key);
  const fallbackValue = readKey(dictionaries[DEFAULT_LOCALE], key);
  const value = localizedValue ?? fallbackValue;

  if (typeof value !== "string") {
    reportMissingTranslation(normalizeLocale(locale), key);
    return String(readKey(dictionaries[DEFAULT_LOCALE], "common.translationUnavailable") ?? "");
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
