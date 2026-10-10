import { parseAuthPhoneNumber } from "@/lib/auth/phone";
import { CURRENT_MARKET } from "@/lib/market";

/** Client-side presentation guard only; the server repeats this policy check. */
export function parseSellerContactPhone(value: string): string | null {
  const policy = CURRENT_MARKET.phonePolicy.sellerContacts;
  if (!policy.enabled) return null;
  const parsed = parseAuthPhoneNumber(value, CURRENT_MARKET.defaultPhoneCountry);
  return parsed.ok && (policy.allowedCountries as readonly string[]).includes(parsed.country) ? parsed.e164 : null;
}

export function sellerContactPhonePlaceholder(): string {
  const policy = CURRENT_MARKET.phonePolicy.sellerContacts;
  return policy.enabled ? `${policy.callingCode} ${policy.nationalPlaceholder}` : "";
}
