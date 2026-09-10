/**
 * The product currently operates only in Turkey. This configuration deliberately
 * centralizes existing market values without introducing multi-market behavior.
 */
export const CURRENT_MARKET = {
  id: "turkey",
  currencyCode: "TRY",
  defaultPhoneCountry: "TR"
} as const;
