# JLC-0523 — Four-language localization architecture inventory

Russian, Kazakh, English, and Simplified Chinese must be converted as one
typed application contract before their registry release. The following source
areas contain embedded `tr/en` maps outside the canonical dictionaries and
must be migrated by domain slice:

- shared layout and routing: `LanguageSwitcher.tsx` (migrated to registry
  labels in the first slice), `middleware.ts`, `i18n/config.ts`, and locale
  route callers;
- auth and country-aware phone presentation: `PhoneInput.tsx` and
  `lib/auth/phone.ts` (migrated: canonical locale metadata now powers CLDR
  display names, sorting, and query normalization, with a language-neutral ISO
  country-code fallback rather than an embedded `tr/en` map);
- homepage/search/saved-search: `features/ai/search` semantic recognition and
  validation messages remain (`HomeTrustSection.tsx`, `SeoEntryLinks.tsx`,
  `ActiveFilterChips.tsx` UI labels, `SearchBar.tsx`, `SavedSearchButton.tsx`,
  `SearchFilters.tsx`, and AI search result summary migrated to canonical
  dictionary domains; legacy tr/en value-formatters and language-recognition
  rules remain for the four-real-dictionary expansion);
- listing cards and dealer detail: `VehicleCard.tsx` (migrated: the video badge
  now uses canonical common dictionary copy), `ReportListingButton.tsx`
  (migrated to dictionaries in the first slice), `ShareListingButton.tsx`,
  listing/detail controls, and public dealer pages;
- seller listing/video flows: `ListingVideoManager.tsx`,
  `my-listings-copy.ts` (migrated: the seller listing UI and safe lifecycle
  error mapper now use the canonical `myListings` dictionary domain rather
  than an embedded `tr/en` map), `MyListingsClient.tsx`, `SellerContactsClient.tsx`
  (migrated to `profile.sellerContacts`),
  rejected edit flows, and seller contact error handling;
- seller wizard and AI assistance: `ListingDescriptionAssistant.tsx`
  (migrated to the canonical `ai.sellDescription` domain, including accessible
  preview-label copy), `SellAssistant.tsx` (migrated to canonical
  `ai.sellAssistant` copy, including field labels), `SellWizard.tsx`,
  `sell-copy.ts` (migrated to the canonical `i18n/dictionaries` boundary),
  `features/ai/sell/sell-draft.ts` (migrated: question and ambiguity copy now
  lives in `i18n/dictionaries/ai-sell-draft.ts`), and `sell-runtime.ts`;
- profile, favorites, notifications, messages, settings, and video:
  `ProfileClient.tsx` (migrated: date formatting uses canonical locale metadata
  and seller-contact copy uses the dictionary), `FavoritesClient.tsx`, `NotificationsClient.tsx`,
  `ConversationClient.tsx` (migrated: message time formatting uses canonical
  locale metadata), `SettingsClient.tsx` (migrated: form copy is dictionary
  backed and the language selector reads released registry locales),
  `FavoritesClient.tsx` (migrated: search CTA is dictionary backed), `PublicVideoPlayer.tsx`,
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
