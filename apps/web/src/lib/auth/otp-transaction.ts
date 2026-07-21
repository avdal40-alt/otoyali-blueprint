import type { AuthPhoneCountry } from "@/lib/auth/phone";
import { isSupportedPhoneCountry, parseAuthPhoneNumber } from "@/lib/auth/phone";

const OTP_TRANSACTION_STORAGE_KEY = "otoyali.auth.otpTransaction";
const OTP_TRANSACTION_TTL_MS = 10 * 60 * 1000;

export type OtpPhoneTransaction = {
  phone: string;
  country: AuthPhoneCountry;
  createdAt: number;
  expiresAt: number;
};

export function createOtpPhoneTransaction(phone: string, country: AuthPhoneCountry): OtpPhoneTransaction {
  const now = Date.now();

  return {
    phone,
    country,
    createdAt: now,
    expiresAt: now + OTP_TRANSACTION_TTL_MS
  };
}

export function saveOtpPhoneTransaction(transaction: OtpPhoneTransaction) {
  if (!canUseSessionStorage()) return;
  sessionStorage.setItem(OTP_TRANSACTION_STORAGE_KEY, JSON.stringify(transaction));
}

export function readOtpPhoneTransaction(): OtpPhoneTransaction | null {
  if (!canUseSessionStorage()) return null;

  const raw = sessionStorage.getItem(OTP_TRANSACTION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<OtpPhoneTransaction>;

    if (
      typeof parsed.phone !== "string" ||
      typeof parsed.country !== "string" ||
      typeof parsed.createdAt !== "number" ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt < Date.now()
    ) {
      clearOtpPhoneTransaction();
      return null;
    }

    if (!isSupportedPhoneCountry(parsed.country)) {
      clearOtpPhoneTransaction();
      return null;
    }

    const phoneResult = parseAuthPhoneNumber(parsed.phone, parsed.country);
    if (!phoneResult.ok || phoneResult.e164 !== parsed.phone) {
      clearOtpPhoneTransaction();
      return null;
    }

    return {
      phone: parsed.phone,
      country: parsed.country,
      createdAt: parsed.createdAt,
      expiresAt: parsed.expiresAt
    };
  } catch {
    clearOtpPhoneTransaction();
    return null;
  }
}

export function clearOtpPhoneTransaction() {
  if (!canUseSessionStorage()) return;
  sessionStorage.removeItem(OTP_TRANSACTION_STORAGE_KEY);
}

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}
