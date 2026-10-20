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
  /**
   * Approved launch languages for this market. This is country configuration,
   * not an instruction to expose routes before that market is activated.
   */
  launchLocales: readonly string[];
  /**
   * Brand colors are intentionally optional until a market has an approved
   * accent. UI tokens fall back to the neutral text color in the meantime.
   */
  brandColors: {
    accent: string | null;
    accentStrong?: string | null;
  };
  metadata: {
    defaultTitle: string;
    description: string;
    openGraphDescription: string;
    defaultLocale: string;
  };
  formatting: MarketFormatting;
  defaultPhoneCountry: "TR" | "KZ";
  phonePolicy: {
    login: { allowedCountries: "any" | readonly ("TR" | "KZ")[] };
    sellerContacts:
      | { enabled: false }
      | {
          enabled: true;
          allowedCountries: readonly ("TR" | "KZ")[];
          verificationPurpose: string;
          verificationProvider: string;
          callingCode: string;
          nationalPlaceholder: string;
        };
  };
  status: "active" | "planned";
};

export type CurrencyPlacement = "prefix" | "suffix";

/**
 * Public indexable routes are country-owned configuration. Keeping these here
 * prevents shared sitemap and robots code from encoding one market's language
 * or URL structure.
 */
export type MarketSeoRouteLocale = {
  staticPaths: readonly string[];
  makePrefix: string;
  cityPrefix: string;
  listingPrefix: string;
  serviceProviderPrefix: string;
};

export type MarketSeoRouteConfig = {
  locales: readonly MarketSeoRouteLocale[];
  disallow: readonly string[];
};

/**
 * Formatting is a market concern. UI language can select an override, while
 * the country profile remains the safe fallback for requests without one.
 */
export type MarketFormatting = {
  defaultIntlLocale: string;
  intlLocaleByLocale: Record<string, string>;
  defaultCurrencyLabel: string;
  currencyLabelByLocale?: Record<string, string>;
  defaultCurrencyPlacement: CurrencyPlacement;
  currencyPlacementByLocale?: Record<string, CurrencyPlacement>;
};

export const MARKET_PROFILES = {
  yolmodTurkey: {
    id: "turkey",
    countryCode: "TR",
    brandName: "Jolcar",
    siteUrl: "https://yolmod.com",
    currencyCode: "TRY",
    launchLocales: ["tr", "en"],
    brandColors: {
      accent: null,
      accentStrong: null
    },
    metadata: {
      defaultTitle: "Türkiye'nin akıllı araç pazarı",
      description: "Otomobil, ticari araç, deniz araçları, yedek parça, sigorta ve araç videoları tek platformda.",
      openGraphDescription: "Türkiye'nin akıllı araç pazarı.",
      defaultLocale: "tr_TR"
    },
    formatting: {
      defaultIntlLocale: "tr-TR",
      intlLocaleByLocale: { tr: "tr-TR", en: "en-US" },
      defaultCurrencyLabel: "TL",
      currencyLabelByLocale: { en: "TRY" },
      defaultCurrencyPlacement: "suffix",
      currencyPlacementByLocale: { en: "prefix" }
    },
    defaultPhoneCountry: "TR",
    phonePolicy: {
      // Keep the existing login behaviour while making the rule explicit.
      login: { allowedCountries: "any" },
      sellerContacts: {
        enabled: true,
        allowedCountries: ["TR"],
        // These are legacy challenge values, isolated at the country boundary.
        verificationPurpose: "turkey_seller_contact",
        verificationProvider: "twilio_verify",
        callingCode: "+90",
        nationalPlaceholder: "555 123 45 67"
      }
    },
    status: "active"
  },
  jolcarKazakhstan: {
    id: "kazakhstan",
    countryCode: "KZ",
    brandName: "Jolcar",
    // The final Jolcar host/domain is an open product decision (O-002).
    siteUrl: null,
    currencyCode: "KZT",
    launchLocales: ["kk-KZ", "ru-KZ", "en"],
    brandColors: {
      accent: null,
      accentStrong: null
    },
    metadata: {
      defaultTitle: "Қазақстанның ақылды көлік нарығы",
      description: "Көліктерді, қосалқы бөлшектерді және автокөлік қызметтерін бір платформадан табыңыз.",
      openGraphDescription: "Қазақстанның ақылды көлік нарығы.",
      defaultLocale: "kk_KZ"
    },
    formatting: {
      // This controls numeric/date conventions only; it does not activate
      // Kazakhstan UI locales, which are delivered by the localization tasks.
      defaultIntlLocale: "kk-KZ",
      intlLocaleByLocale: {},
      defaultCurrencyLabel: "₸",
      defaultCurrencyPlacement: "suffix"
    },
    defaultPhoneCountry: "KZ",
    phonePolicy: {
      login: { allowedCountries: "any" },
      // O-005 confirms the policy, but activation belongs to the dedicated
      // country-aware phone and provider rollout tasks.
      sellerContacts: { enabled: false }
    },
    status: "planned"
  }
} as const satisfies Record<string, MarketProfile>;

export const MARKET_SEO_ROUTE_CONFIG = {
  TR: {
    locales: [
      {
        staticPaths: ["/", "/search", "/video", "/ikinci-el-araba", "/sifir-km-araba", "/elektrikli-araclar", "/otomatik-vites-araclar", "/suv-araclar", "/ai-asistan", "/terms", "/privacy", "/cookies", "/listing-rules", "/moderation-policy", "/trust", "/contact"],
        makePrefix: "/marka",
        cityPrefix: "/sehir",
        listingPrefix: "/listing",
        serviceProviderPrefix: "/servisler"
      },
      {
        staticPaths: ["/en", "/en/search", "/en/video", "/en/used-cars", "/en/new-cars", "/en/electric-vehicles", "/en/automatic-cars", "/en/suv", "/en/ai-assistant", "/en/terms", "/en/privacy", "/en/cookies", "/en/listing-rules", "/en/moderation-policy", "/en/trust", "/en/contact"],
        makePrefix: "/en/make",
        cityPrefix: "/en/city",
        listingPrefix: "/en/listing",
        serviceProviderPrefix: "/en/services"
      }
    ],
    disallow: ["/profile", "/en/profile", "/my-listings", "/en/my-listings", "/settings", "/en/settings", "/admin", "/admin/*", "/en/admin", "/en/admin/*", "/login", "/en/login", "/otp", "/en/otp", "/debug", "/api/private"]
  },
  KZ: {
    // These launch locales are configured now, but cannot be emitted until a
    // Jolcar host and public route implementation are explicitly enabled.
    locales: [],
    disallow: ["/profile", "/my-listings", "/settings", "/admin", "/admin/*", "/login", "/otp", "/debug", "/api/private"]
  }
} as const satisfies Record<MarketProfile["countryCode"], MarketSeoRouteConfig>;

export function getMarketSeoRouteConfig(profile: MarketProfile = ACTIVE_MARKET_PROFILE): MarketSeoRouteConfig {
  return MARKET_SEO_ROUTE_CONFIG[profile.countryCode];
}

export type MarketProfileKey = keyof typeof MARKET_PROFILES;

/**
 * This preserves the current production selection. Switching profiles and
 * country-specific routing remain explicit follow-up work.
 */
export const ACTIVE_MARKET_PROFILE_KEY = "yolmodTurkey" satisfies MarketProfileKey;
export const ACTIVE_MARKET_PROFILE = MARKET_PROFILES[ACTIVE_MARKET_PROFILE_KEY];

export type MarketProfileResult =
  | { status: "available"; profile: MarketProfile }
  | { status: "unavailable"; error: "MARKET_PROFILE_UNAVAILABLE"; reason: "market-profile-not-configured" };

/**
 * Resolve an explicitly requested market without silently borrowing another
 * country's defaults when a deployment/configuration value is absent or bad.
 */
export function getMarketProfile(marketKey: MarketProfileKey | string | null | undefined = ACTIVE_MARKET_PROFILE_KEY): MarketProfileResult {
  if (!marketKey || typeof marketKey !== "string") {
    return { status: "unavailable", error: "MARKET_PROFILE_UNAVAILABLE", reason: "market-profile-not-configured" };
  }

  const profile = MARKET_PROFILES[marketKey as MarketProfileKey];
  return profile
    ? { status: "available", profile }
    : { status: "unavailable", error: "MARKET_PROFILE_UNAVAILABLE", reason: "market-profile-not-configured" };
}

// Compatibility alias for existing shared consumers. New code should use the
// explicit profile name so country/brand dependencies stay visible.
export const CURRENT_MARKET = ACTIVE_MARKET_PROFILE;

export function getMarketScopeLabel(profile: MarketProfile = ACTIVE_MARKET_PROFILE) {
  return profile.countryCode === "KZ" ? "Қазақстан" : "Türkiye";
}

export const ACTIVE_MARKET_SCOPE_LABEL = getMarketScopeLabel();
