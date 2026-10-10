/**
 * Product-specific values live here rather than in shared marketplace, auth, or
 * SEO code. A profile is selected at build/deployment time; this module does
 * not infer a market from a user's locale, phone number, or request data.
 */
export type MarketProfile = {
  id: string;
  countryCode: "TR" | "KZ";
  brandName: string;
  siteUrl: string | null;
  currencyCode: "TRY" | "KZT";
  defaultPhoneCountry: "TR" | "KZ";
  status: "active" | "planned";
};

export const MARKET_PROFILES = {
  yolmodTurkey: {
    id: "turkey",
    countryCode: "TR",
    brandName: "Yolmod",
    siteUrl: "https://yolmod.com",
    currencyCode: "TRY",
    defaultPhoneCountry: "TR",
    status: "active"
  },
  jolcarKazakhstan: {
    id: "kazakhstan",
    countryCode: "KZ",
    brandName: "Jolcar",
    // The final Jolcar host/domain is an open product decision (O-002).
    siteUrl: null,
    currencyCode: "KZT",
    defaultPhoneCountry: "KZ",
    status: "planned"
  }
} as const satisfies Record<string, MarketProfile>;

export type MarketProfileKey = keyof typeof MARKET_PROFILES;

/**
 * This preserves the current production selection. Switching profiles and
 * country-specific routing remain explicit follow-up work.
 */
export const ACTIVE_MARKET_PROFILE_KEY = "yolmodTurkey" satisfies MarketProfileKey;
export const ACTIVE_MARKET_PROFILE = MARKET_PROFILES[ACTIVE_MARKET_PROFILE_KEY];

// Compatibility alias for existing shared consumers. New code should use the
// explicit profile name so country/brand dependencies stay visible.
export const CURRENT_MARKET = ACTIVE_MARKET_PROFILE;
