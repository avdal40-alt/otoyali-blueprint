import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode
} from "libphonenumber-js/max";
import type { Locale } from "@/i18n/types";

export type AuthPhoneCountry = CountryCode;

export type PhoneValidationError =
  | "empty_input"
  | "invalid_country"
  | "malformed_number"
  | "impossible_number"
  | "invalid_number"
  | "ambiguous_country";

export type PhoneParseResult =
  | {
      ok: true;
      e164: string;
      country: AuthPhoneCountry;
      isInternationalInput: boolean;
    }
  | {
      ok: false;
      error: PhoneValidationError;
    };

export type PhoneCountryOption = {
  country: AuthPhoneCountry;
  name: string;
  callingCode: string;
  searchText: string;
};

export const DEFAULT_PHONE_COUNTRY: AuthPhoneCountry = "TR";

const supportedCountries = new Set<AuthPhoneCountry>(getCountries());

const regionFallbacks: Partial<Record<AuthPhoneCountry, { tr: string; en: string }>> = {
  TR: { tr: "Türkiye", en: "Turkey" },
  KZ: { tr: "Kazakistan", en: "Kazakhstan" },
  RU: { tr: "Rusya", en: "Russia" },
  US: { tr: "Amerika Birleşik Devletleri", en: "United States" },
  GB: { tr: "Birleşik Krallık", en: "United Kingdom" }
};

export function isSupportedPhoneCountry(value: string | null | undefined): value is AuthPhoneCountry {
  return Boolean(value && supportedCountries.has(value as AuthPhoneCountry));
}

export function parseAuthPhoneNumber(rawInput: string, selectedCountry: AuthPhoneCountry = DEFAULT_PHONE_COUNTRY): PhoneParseResult {
  const value = rawInput.trim();

  if (!value) {
    return { ok: false, error: "empty_input" };
  }

  if (!isSupportedPhoneCountry(selectedCountry)) {
    return { ok: false, error: "invalid_country" };
  }

  const isInternationalInput = value.startsWith("+");
  const parsed = parsePhoneNumberFromString(
    value,
    isInternationalInput
      ? { extract: false }
      : {
          defaultCountry: selectedCountry,
          extract: false
        }
  );

  if (!parsed) {
    return { ok: false, error: "malformed_number" };
  }

  if (!parsed.isPossible()) {
    return { ok: false, error: "impossible_number" };
  }

  if (!parsed.isValid()) {
    return { ok: false, error: "invalid_number" };
  }

  const country = parsed.country;

  if (!country || !isSupportedPhoneCountry(country)) {
    return { ok: false, error: "ambiguous_country" };
  }

  if (!isInternationalInput && country !== selectedCountry) {
    return { ok: false, error: "ambiguous_country" };
  }

  return {
    ok: true,
    e164: parsed.number,
    country,
    isInternationalInput
  };
}

export function getPhoneCountryOptions(locale: Locale): PhoneCountryOption[] {
  const displayNames = createRegionDisplayNames(locale);
  const countries = getCountries();

  return countries
    .map((country) => {
      const callingCode = `+${getCountryCallingCode(country)}`;
      const name = getCountryName(country, locale, displayNames);

      return {
        country,
        name,
        callingCode,
        searchText: `${name} ${country} ${callingCode}`.toLocaleLowerCase(locale === "tr" ? "tr-TR" : "en-US")
      };
    })
    .sort((a, b) => {
      if (a.country === DEFAULT_PHONE_COUNTRY) return -1;
      if (b.country === DEFAULT_PHONE_COUNTRY) return 1;

      return a.name.localeCompare(b.name, locale === "tr" ? "tr-TR" : "en-US");
    });
}

export function maskE164Phone(value: string) {
  const parsed = parsePhoneNumberFromString(value, { extract: false });
  const normalized = parsed?.number ?? value;
  const digits = normalized.replace(/\D/g, "");

  if (digits.length <= 6) {
    return normalized;
  }

  const prefix = parsed?.country
    ? `+${getCountryCallingCode(parsed.country)}`
    : normalized.startsWith("+")
      ? `+${digits.slice(0, Math.max(1, digits.length - 10))}`
      : digits.slice(0, 2);
  const suffix = digits.slice(-2);

  return `${prefix} *** *** ${suffix}`;
}

function createRegionDisplayNames(locale: Locale) {
  if (typeof Intl.DisplayNames === "undefined") {
    return null;
  }

  try {
    return new Intl.DisplayNames([locale === "tr" ? "tr-TR" : "en-US"], { type: "region" });
  } catch {
    return null;
  }
}

function getCountryName(country: AuthPhoneCountry, locale: Locale, displayNames: Intl.DisplayNames | null) {
  const fallback = regionFallbacks[country]?.[locale] ?? country;
  return displayNames?.of(country) ?? fallback;
}
