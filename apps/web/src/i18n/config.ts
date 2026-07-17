import type { FutureLocale, Locale, LocaleDirection } from "./types";

export const SUPPORTED_LOCALES = ["tr", "en"] as const;
export const FUTURE_LOCALES = ["de", "ar", "ru"] as const satisfies readonly FutureLocale[];
export const DEFAULT_LOCALE: Locale = "tr";
export const LOCALE_COOKIE_NAME = "otoyali_locale";
export const LOCALE_HEADER_NAME = "x-otoyali-locale";

export const LOCALE_CONFIG: Record<Locale, { label: string; nativeLabel: string; dir: LocaleDirection; intlLocale: string }> = {
  tr: {
    label: "Turkish",
    nativeLabel: "Türkçe",
    dir: "ltr",
    intlLocale: "tr-TR"
  },
  en: {
    label: "English",
    nativeLabel: "English",
    dir: "ltr",
    intlLocale: "en-US"
  }
};

const EN_TO_TR_STATIC_PATHS: Record<string, string> = {
  "/used-cars": "/ikinci-el-araba",
  "/new-cars": "/sifir-km-araba",
  "/electric-vehicles": "/elektrikli-araclar",
  "/automatic-cars": "/otomatik-vites-araclar",
  "/suv": "/suv-araclar",
  "/commercial-vehicles": "/ticari-araclar",
  "/marine-vehicles": "/deniz-araclari",
  "/spare-parts": "/yedek-parca",
  "/insurance": "/sigorta",
  "/services": "/servisler",
  "/ai-assistant": "/ai-asistan",
  "/listing-rules": "/listing-rules",
  "/moderation-policy": "/moderation-policy",
  "/trust": "/trust",
  "/terms": "/terms",
  "/privacy": "/privacy",
  "/cookies": "/cookies",
  "/contact": "/contact",
  "/about": "/about",
  "/news": "/news",
  "/search": "/search",
  "/video": "/video",
  "/sell": "/sell",
  "/login": "/login",
  "/otp": "/otp",
  "/profile": "/profile",
  "/favorites": "/favorites",
  "/settings": "/settings",
  "/my-listings": "/my-listings",
  "/notifications": "/notifications"
};

const TR_TO_EN_STATIC_PATHS = Object.fromEntries(Object.entries(EN_TO_TR_STATIC_PATHS).map(([enPath, trPath]) => [trPath, enPath]));

export function isSupportedLocale(value?: string | null): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

export function normalizeLocale(value?: string | null): Locale {
  if (!value) return DEFAULT_LOCALE;
  const candidate = value.toLowerCase().split(/[-_]/)[0];
  return isSupportedLocale(candidate) ? candidate : DEFAULT_LOCALE;
}

export function getLocaleDirection(locale: Locale): LocaleDirection {
  return LOCALE_CONFIG[locale]?.dir ?? "ltr";
}

export function getIntlLocale(locale: Locale) {
  return LOCALE_CONFIG[locale]?.intlLocale ?? LOCALE_CONFIG[DEFAULT_LOCALE].intlLocale;
}

export function stripLocalePrefix(pathname: string): { locale: Locale | null; pathname: string } {
  const normalized = normalizePathname(pathname);
  const segments = normalized.split("/").filter(Boolean);
  const first = segments[0];

  if (first === "en" || first === "tr") {
    const stripped = `/${segments.slice(1).join("/")}`;
    return {
      locale: first,
      pathname: normalizePathname(stripped === "/" ? "/" : stripped)
    };
  }

  return { locale: null, pathname: normalized };
}

export function getLocalePath(locale: Locale, pathname = "/") {
  const normalized = normalizePathname(pathname);
  if (locale === DEFAULT_LOCALE) return normalized;
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`;
}

export function localizePath(
  href: string,
  locale: Locale,
  options: { forceDefaultLocalePrefix?: boolean } = {}
) {
  if (!isInternalHref(href)) return "/";

  const { pathname, suffix } = splitHref(href);
  const stripped = stripLocalePrefix(pathname).pathname;
  const turkishPath = englishPathToTurkishPath(stripped);
  const targetPath = locale === "en" ? turkishPathToEnglishPath(turkishPath) : turkishPath;

  if (locale === DEFAULT_LOCALE) {
    return `${options.forceDefaultLocalePrefix ? getLocalePath(DEFAULT_LOCALE, targetPath).replace(/^\//, "/tr/").replace("/tr//", "/tr/") : targetPath}${suffix}`;
  }

  return `${getLocalePath(locale, targetPath)}${suffix}`;
}

export function rewriteLocalePath(pathname: string) {
  const { locale, pathname: stripped } = stripLocalePrefix(pathname);
  if (!locale) return normalizePathname(pathname);
  if (locale === "tr") return stripped;
  return englishPathToTurkishPath(stripped);
}

export function turkishPathToEnglishPath(pathname: string) {
  const normalized = normalizePathname(pathname);

  if (normalized.startsWith("/listing/")) return normalized;
  if (normalized.startsWith("/news/")) return normalized;
  if (normalized.startsWith("/marka/")) return normalized.replace(/^\/marka\//, "/make/");
  if (normalized.startsWith("/sehir/")) return normalized.replace(/^\/sehir\//, "/city/");

  return TR_TO_EN_STATIC_PATHS[normalized] ?? normalized;
}

export function englishPathToTurkishPath(pathname: string) {
  const normalized = normalizePathname(pathname);

  if (normalized.startsWith("/listing/")) return normalized;
  if (normalized.startsWith("/news/")) return normalized;
  if (normalized.startsWith("/make/")) return normalized.replace(/^\/make\//, "/marka/");
  if (normalized.startsWith("/city/")) return normalized.replace(/^\/city\//, "/sehir/");

  return EN_TO_TR_STATIC_PATHS[normalized] ?? normalized;
}

export function pickLocaleFromAcceptLanguage(headerValue?: string | null): Locale | null {
  if (!headerValue) return null;

  const ranked = headerValue
    .split(",")
    .map((item) => {
      const [rawLocale, rawQuality] = item.trim().split(";q=");
      return {
        locale: normalizeLocale(rawLocale),
        quality: rawQuality ? Number(rawQuality) : 1
      };
    })
    .filter((item) => Number.isFinite(item.quality))
    .sort((a, b) => b.quality - a.quality);

  return ranked[0]?.locale ?? null;
}

export function isInternalHref(href: string) {
  return href.startsWith("/") && !href.startsWith("//") && !href.includes("://");
}

function normalizePathname(pathname: string) {
  const clean = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return clean.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

function splitHref(href: string) {
  const hashIndex = href.indexOf("#");
  const beforeHash = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const queryIndex = beforeHash.indexOf("?");
  const pathname = queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash;
  const query = queryIndex >= 0 ? beforeHash.slice(queryIndex) : "";

  return { pathname: pathname || "/", suffix: `${query}${hash}` };
}
