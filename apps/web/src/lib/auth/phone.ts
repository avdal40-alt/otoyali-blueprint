import {
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  parsePhoneNumberFromString,
  type CountryCode
} from "libphonenumber-js/max";
import mobileExamples from "libphonenumber-js/examples.mobile.json";
import { getIntlLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/types";
import { CURRENT_MARKET } from "@/lib/market";

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

export const DEFAULT_PHONE_COUNTRY: AuthPhoneCountry = CURRENT_MARKET.defaultPhoneCountry;

// Product-approved examples keep the launch-market hints familiar while all
// other countries use the library's representative mobile-number metadata.
const phoneExampleOverrides: Partial<Record<AuthPhoneCountry, string>> = {
  KZ: "+7 777 123 45 67",
  TR: "+90 555 123 45 67"
};

const supportedCountries = new Set<AuthPhoneCountry>(getCountries());

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

export function normalizeStoredAuthPhoneToE164(value: string | null | undefined): string | null {
  const storedPhone = value?.trim();

  if (!storedPhone || !/^\+?[1-9][0-9]{1,14}$/.test(storedPhone)) {
    return null;
  }

  const internationalPhone = storedPhone.startsWith("+") ? storedPhone : `+${storedPhone}`;
  const parsed = parsePhoneNumberFromString(internationalPhone, { extract: false });

  if (!parsed?.isPossible() || !parsed.isValid()) {
    return null;
  }

  return parsed.number;
}

export function getPhoneCountryOptions(locale: Locale): PhoneCountryOption[] {
  const displayNames = createRegionDisplayNames(locale);
  const intlLocale = getIntlLocale(locale);
  const countries = getCountries();

  return countries
    .map((country) => {
      const callingCode = `+${getCountryCallingCode(country)}`;
      const name = getCountryName(country, displayNames);

      return {
        country,
        name,
        callingCode,
        searchText: `${name} ${country} ${callingCode}`.toLocaleLowerCase(intlLocale)
      };
    })
    .sort((a, b) => {
      if (a.country === DEFAULT_PHONE_COUNTRY) return -1;
      if (b.country === DEFAULT_PHONE_COUNTRY) return 1;

      return a.name.localeCompare(b.name, intlLocale);
    });
}

export function getAuthPhoneExample(country: AuthPhoneCountry): string {
  const override = phoneExampleOverrides[country];
  if (override) return override;

  return getExampleNumber(country, mobileExamples)?.formatInternational() ?? `+${getCountryCallingCode(country)}`;
}

export function formatPhoneInputHelper(template: string, country: AuthPhoneCountry): string {
  return template.replace("{example}", getAuthPhoneExample(country));
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
    return new Intl.DisplayNames([getIntlLocale(locale)], { type: "region" });
  } catch {
    return null;
  }
}

function getCountryName(country: AuthPhoneCountry, displayNames: Intl.DisplayNames | null) {
  // The runtime's CLDR data provides country names for every released locale.
  // A country code is a language-neutral last resort when that API is absent.
  return displayNames?.of(country) ?? country;
}
