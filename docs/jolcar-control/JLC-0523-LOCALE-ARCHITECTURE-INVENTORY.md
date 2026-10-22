# JLC-0523 — Four-language localization architecture inventory

Russian, Kazakh, English, and Simplified Chinese must be converted as one
typed application contract before their registry release. The following source
areas contain embedded `tr/en` maps outside the canonical dictionaries and
must be migrated by domain slice:

- shared layout and routing: `LanguageSwitcher.tsx` (migrated to registry
  labels in the first slice), `middleware.ts`, `i18n/config.ts`, and locale
  route callers;
- auth and country-aware phone presentation: `PhoneInput.tsx` and
  `lib/auth/phone.ts` (`phone.ts` migrated: CLDR display names and sorting now
  use the canonical locale metadata, with a language-neutral ISO country-code
  fallback rather than an embedded `tr/en` map);
- homepage/search/saved-search: `SearchBar.tsx`, `SearchFilters.tsx`,
  `ActiveFilterChips.tsx`, `SavedSearchButton.tsx`, home SEO/trust components,
  and `features/ai/search`;
- listing and dealer detail: `ReportListingButton.tsx` (migrated to
  dictionaries in the first slice), `ShareListingButton.tsx`, listing/detail
  controls, and public dealer pages;
- seller listing/video flows: `ListingVideoManager.tsx`,
  `my-listings-copy.ts` (migrated: the seller listing UI and safe lifecycle
  error mapper now use the canonical `myListings` dictionary domain rather
  than an embedded `tr/en` map), `MyListingsClient.tsx`, `SellerContactsClient.tsx`,
  rejected edit flows, and seller contact error handling;
- seller wizard and AI assistance: `ListingDescriptionAssistant.tsx`
  (migrated to the canonical `ai.sellDescription` domain, including accessible
  preview-label copy), `SellAssistant.tsx`, `SellWizard.tsx`, `sell-copy.ts`,
  `features/ai/sell/sell-draft.ts`, and `sell-runtime.ts`;
- profile, favorites, notifications, messages, settings, and video:
  `ProfileClient.tsx`, `FavoritesClient.tsx`, `NotificationsClient.tsx`,
  `ConversationClient.tsx`, `SettingsClient.tsx`, `PublicVideoPlayer.tsx`,
  and video pages;
- dealer/service and AI support: `ServiceApplicationForm.tsx`, service public
  pages, `PriceIntelligenceCard.tsx`, AI providers/hooks/services;
- formatting and shared enum labels: `src/lib/format.ts`, including date,
  number, currency, vehicle enum, city, and relative-date presentation;
- API validation and metadata: locale validation in API routes plus all
  canonical, hreflang, sitemap, and metadata route producers.

The inventory is intentionally source-specific: all of these must move to
canonical dictionary/locale helpers in coherent domain slices. No locale
registry release is authorized until each affected surface has real Russian,
Kazakh, English, and Simplified Chinese coverage with Russian fallback behavior.
