import type { Locale } from "@/i18n/types";
import { t } from "@/i18n/get-dictionary";

export type AuthErrorCategory =
  | "invalid_phone"
  | "ambiguous_phone_country"
  | "otp_send_failed"
  | "sms_unavailable"
  | "too_many_requests"
  | "invalid_or_expired_otp"
  | "missing_session"
  | "network_unavailable"
  | "generic_auth_failure";

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

export function authErrorMessage(category: AuthErrorCategory, locale: Locale = "tr") {
  const keyByCategory: Record<AuthErrorCategory, string> = {
    invalid_phone: "errors.invalidPhone",
    ambiguous_phone_country: "errors.ambiguousPhoneCountry",
    otp_send_failed: "errors.otpSendFailed",
    sms_unavailable: "errors.smsUnavailable",
    too_many_requests: "errors.tooManyRequests",
    invalid_or_expired_otp: "errors.invalidOtp",
    missing_session: "errors.missingSession",
    network_unavailable: "errors.networkUnavailable",
    generic_auth_failure: "errors.generic"
  };

  return t(locale, keyByCategory[category]);
}

export function mapAuthError(error?: unknown, fallback: AuthErrorCategory = "generic_auth_failure"): AuthErrorCategory {
  if (!error) return fallback;

  const text = readSafeErrorText(error);

  if (
    text.includes("rate") ||
    text.includes("too many") ||
    text.includes("frequency") ||
    text.includes("limit") ||
    text.includes("429")
  ) {
    return "too_many_requests";
  }

  if (text.includes("network") || text.includes("fetch") || text.includes("timeout") || text.includes("offline")) {
    return "network_unavailable";
  }

  if (
    text.includes("sms") ||
    text.includes("provider") ||
    (text.includes("phone") && text.includes("disabled")) ||
    text.includes("unsupported")
  ) {
    return "sms_unavailable";
  }

  if (text.includes("phone") || text.includes("e.164") || text.includes("mobile")) {
    return "invalid_phone";
  }

  if (text.includes("invalid") || text.includes("token") || text.includes("otp") || text.includes("expired")) {
    return "invalid_or_expired_otp";
  }

  if (text.includes("session") || text.includes("auth session missing")) {
    return "missing_session";
  }

  return fallback;
}

export function friendlyAuthError(message?: string | null, locale: Locale = "tr") {
  return authErrorMessage(mapAuthError(message), locale);
}

export function isMissingAuthSessionError(message?: string | null) {
  const text = (message ?? "").toLowerCase();
  return text.includes("auth session missing") || text.includes("session");
}

function readSafeErrorText(error: unknown) {
  if (typeof error === "string") {
    return error.toLowerCase();
  }

  if (error && typeof error === "object") {
    const maybeError = error as { message?: unknown; name?: unknown; status?: unknown; code?: unknown };
    return [maybeError.name, maybeError.message, maybeError.status, maybeError.code]
      .filter((value): value is string | number => typeof value === "string" || typeof value === "number")
      .join(" ")
      .toLowerCase();
  }

  return "";
}
