import type { Locale } from "@/i18n/types";
import { t } from "@/i18n/get-dictionary";

export function safeNextPath(value?: string | null, fallback = "/profile") {
  if (!value) return fallback;

  try {
    const decoded = decodeURIComponent(value);
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return fallback;
    if (decoded.includes("://")) return fallback;
    return decoded;
  } catch {
    return fallback;
  }
}

export function friendlyAuthError(message?: string | null, locale: Locale = "tr") {
  const text = (message ?? "").toLowerCase();

  if (
    text.includes("sms") ||
    text.includes("provider") ||
    (text.includes("phone") && text.includes("disabled")) ||
    text.includes("unsupported")
  ) {
    return t(locale, "errors.smsUnavailable");
  }

  if (text.includes("invalid") || text.includes("token") || text.includes("otp") || text.includes("expired")) {
    return t(locale, "errors.invalidOtp");
  }

  if (text.includes("session") || text.includes("auth session missing")) {
    return t(locale, "errors.missingSession");
  }

  return t(locale, "errors.generic");
}

export function isMissingAuthSessionError(message?: string | null) {
  const text = (message ?? "").toLowerCase();
  return text.includes("auth session missing") || text.includes("session");
}
