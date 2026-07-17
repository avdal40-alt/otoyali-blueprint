import { en } from "./dictionaries/en";
import { tr } from "./dictionaries/tr";
import { DEFAULT_LOCALE, normalizeLocale } from "./config";
import type { ClientDictionary, Dictionary, DictionarySection, Locale, TranslationParams } from "./types";

const dictionaries: Record<Locale, Dictionary> = {
  tr,
  en
};

export function getDictionary(locale?: string | null): Dictionary {
  return dictionaries[normalizeLocale(locale)] ?? dictionaries[DEFAULT_LOCALE];
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
    admin: dictionary.admin,
    auth: dictionary.auth,
    errors: dictionary.errors,
    validation: dictionary.validation,
    status: dictionary.status,
    format: dictionary.format
  };
}

export function t(locale: Locale | string | null | undefined, key: string, params?: TranslationParams) {
  const dictionary = getDictionary(locale);
  const value = readKey(dictionary, key) ?? readKey(dictionaries[DEFAULT_LOCALE], key) ?? key;

  if (typeof value !== "string") return key;
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
