export type Locale = "tr" | "en";
export type FutureLocale = "de" | "ar" | "ru";
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
