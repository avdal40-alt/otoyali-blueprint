import { DEFAULT_LOCALE, normalizeLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/types";
import type { AuthPhoneCountry } from "@/lib/auth/phone";
import { isSupportedPhoneCountry } from "@/lib/auth/phone";

const MAX_TIMEZONE_LENGTH = 80;
const controlCharacterPattern = /[\u0000-\u001F\u007F]/;
const ianaTimezonePattern = /^(?:UTC|[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+)$/;
const utcOffsetPattern = /^[+-]\d{2}:?\d{2}$/;

export type PhoneSignupMetadata = {
  country: AuthPhoneCountry;
  language: Locale;
  timezone?: string;
};

export function buildPhoneSignupMetadata({
  selectedCountry,
  locale,
  resolveTimeZone = resolveBrowserTimeZone
}: {
  selectedCountry: string | null | undefined;
  locale?: string | null;
  resolveTimeZone?: () => string | null | undefined;
}): PhoneSignupMetadata | null {
  if (!isSupportedPhoneCountry(selectedCountry)) {
    return null;
  }

  const timezone = sanitizeSignupTimezone(resolveSafeTimeZone(resolveTimeZone));
  const metadata: PhoneSignupMetadata = {
    country: selectedCountry,
    language: normalizeLocale(locale ?? DEFAULT_LOCALE)
  };

  if (timezone) {
    metadata.timezone = timezone;
  }

  return metadata;
}

export function resolveBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

export function sanitizeSignupTimezone(value: string | null | undefined) {
  if (typeof value !== "string") return null;
  if (!value || value.length > MAX_TIMEZONE_LENGTH) return null;
  if (value.trim() !== value) return null;
  if (controlCharacterPattern.test(value)) return null;
  if (utcOffsetPattern.test(value)) return null;
  if (!ianaTimezonePattern.test(value)) return null;
  return value;
}

function resolveSafeTimeZone(resolveTimeZone: () => string | null | undefined) {
  try {
    return resolveTimeZone();
  } catch {
    return null;
  }
}
