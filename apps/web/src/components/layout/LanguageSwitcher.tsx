"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getLocaleSwitchPath, SUPPORTED_LOCALES } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/types";
import { getLocationHref, persistLocaleAndNavigate } from "./locale-switch";

const languageKey: Record<Locale, "turkish" | "english"> = {
  tr: "turkish",
  en: "english"
};

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, dictionary } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hash, setHash] = useState("");
  const query = searchParams.toString();
  const currentHref = getLocationHref(pathname, query, hash);

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);

    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    setHash(window.location.hash);
  }, [pathname, query]);

  function switchLocale(nextLocale: Locale) {
    // The root locale provider is intentionally request-derived. Use one document
    // navigation so the new request receives the cookie and mounts the new locale.
    persistLocaleAndNavigate(nextLocale, getLocationHref(pathname, query, window.location.hash));
  }

  return (
    <nav className={`inline-flex rounded-full border border-oto-border p-1 text-xs font-bold ${className}`} aria-label={String(dictionary.common.language)}>
      {SUPPORTED_LOCALES.map((candidate) => (
        candidate === locale ? (
          <span
            key={candidate}
            className="rounded-full bg-oto-text px-2 py-1 text-white"
            lang={candidate}
            aria-current="true"
          >
            {String(dictionary.common[languageKey[candidate]])}
          </span>
        ) : (
          <a
            key={candidate}
            href={getLocaleSwitchPath(currentHref, candidate)}
            onClick={(event) => {
              event.preventDefault();
              switchLocale(candidate);
            }}
            className="rounded-full px-2 py-1 text-oto-muted hover:bg-oto-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oto-blue"
            hrefLang={candidate}
            lang={candidate}
          >
            {String(dictionary.common[languageKey[candidate]])}
          </a>
        )
      ))}
    </nav>
  );
}
