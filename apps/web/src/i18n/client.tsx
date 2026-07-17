"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { DEFAULT_LOCALE } from "./config";
import { getClientDictionary } from "./get-dictionary";
import type { ClientDictionary, Locale } from "./types";

type I18nContextValue = {
  locale: Locale;
  dictionary: ClientDictionary;
};

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  dictionary: getClientDictionary(DEFAULT_LOCALE)
});

export function I18nProvider({
  locale,
  dictionary,
  children
}: {
  locale: Locale;
  dictionary: ClientDictionary;
  children: ReactNode;
}) {
  return <I18nContext.Provider value={{ locale, dictionary }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
