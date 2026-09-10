import type { LOCALE_REGISTRY } from "./config";

/** Route locale identifiers configured in the locale registry. */
export type LocaleId = keyof typeof LOCALE_REGISTRY;

/** Locales currently released in the application and backed by messages. */
export type Locale = {
  [Id in LocaleId]: (typeof LOCALE_REGISTRY)[Id]["released"] extends true ? Id : never;
}[LocaleId];
export type LocaleDirection = "ltr" | "rtl";

export type TranslationValue = string | DictionarySection;
export type DictionarySection = {
  [key: string]: TranslationValue;
};

export type TranslationParams = Record<string, string | number | boolean | null | undefined>;

export type Dictionary = {
  common: DictionarySection;
  navigation: DictionarySection;
  footer: DictionarySection;
  home: DictionarySection;
  search: DictionarySection;
  listing: DictionarySection;
  sell: DictionarySection;
  profile: DictionarySection;
  favorites: DictionarySection;
  myListings: DictionarySection;
  auth: DictionarySection;
  video: DictionarySection;
  services: DictionarySection;
  admin: DictionarySection;
  legal: DictionarySection;
  trust: DictionarySection;
  errors: DictionarySection;
  validation: DictionarySection;
  status: DictionarySection;
  seo: DictionarySection;
  verticals: DictionarySection;
  ai: DictionarySection;
  futureVerticals: DictionarySection;
  format: DictionarySection;
};

export type ClientDictionary = Pick<
  Dictionary,
  | "common"
  | "navigation"
  | "footer"
  | "home"
  | "listing"
  | "sell"
  | "profile"
  | "favorites"
  | "myListings"
  | "services"
  | "admin"
  | "auth"
  | "errors"
  | "validation"
  | "status"
  | "verticals"
  | "ai"
  | "format"
  | "search"
>;
