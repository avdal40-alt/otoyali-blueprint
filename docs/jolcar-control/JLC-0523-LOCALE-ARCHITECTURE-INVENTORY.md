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
- homepage/search/saved-search: `features/ai/search` language-recognition
  rules remain (`HomeTrustSection.tsx`, `SeoEntryLinks.tsx`,
  `ActiveFilterChips.tsx` UI labels, `SearchBar.tsx`, `SavedSearchButton.tsx`,
  `SearchFilters.tsx`, and AI Search result, availability, clarification, and
  catalog-validation messages migrated to canonical dictionary domains;
  Kazakhstan price and mileage semantic recognition now covers Russian,
  Kazakh, English, and Simplified Chinese KZT/tenge terms (including the
  English `tenge` spelling and `less than` threshold wording), and the in-memory
  listing query/city filter no longer applies Turkish normalization or collation;
  AI Search result, availability, clarification, and catalog-validation
  messages now have direct RU/KK/EN/zh-CN dictionary coverage; deterministic
  reset, comparison, threshold, fuel, transmission, media, and sorting intent
  recognition now covers the same four launch languages without changing the
  Kazakhstan search catalog or market context; remaining legacy
  value-formatters remain for the four-real-dictionary expansion);
- listing cards and dealer detail: `VehicleCard.tsx` (migrated: the video badge
  now uses canonical common dictionary copy), `ReportListingButton.tsx`
  (migrated to dictionaries in the first slice), and `ShareListingButton.tsx`
  (migrated: copied-link feedback uses the canonical listing dictionary);
  `app/dealer/[id]/page.tsx` now uses the canonical `profile.dealerPage`
  dictionary domain for its profile, tabs, empty, post, listing, and live UI;
  other listing/detail controls remain;
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
  lives in `i18n/dictionaries/ai-sell-draft.ts` with direct RU/KK/EN/zh-CN
  launch copy), and `sell-runtime.ts` (migrated: generated-description
  templates and bounded field recognition now have direct launch-language
  coverage rather than Turkish/English-only branches);
- profile, favorites, notifications, messages, settings, and video:
  `ProfileClient.tsx` (migrated: date formatting uses canonical locale metadata
  and seller-contact copy uses the dictionary), `FavoritesClient.tsx`,
  `NotificationsClient.tsx` (migrated: notification labels are dictionary backed
  and dates use canonical locale metadata),
  `ConversationClient.tsx` (migrated: message time formatting uses canonical
  locale metadata), `SettingsClient.tsx` (migrated: form copy is dictionary
  backed and the language selector reads released registry locales),
  `FavoritesClient.tsx` (migrated: search CTA is dictionary backed), `PublicVideoPlayer.tsx`,
  and video pages;
- dealer/service and AI support: `ServiceApplicationForm.tsx`, service public
  pages, `PriceIntelligenceCard.tsx`; AI hook/service message-length and
  unavailable responses migrated to the scoped `ai-assistant` dictionary;
  public listing-expert availability, fact, comparison, and criterion messages
  now use `i18n/dictionaries/ai-listing-expert.ts` with direct RU/KK/EN/zh-CN
  launch copy, and its deterministic comparison criteria recognize those four
  launch languages; fact selection also recognizes common launch-language
  synonyms for transmission, mileage, engine displacement, price, city, and
  seller without changing the public-data-only comparison boundary;
  `features/ai/providers/local-provider.ts` now sources its service, search,
  publishing, and trust guidance lists from `ai-local-provider.ts` with direct
  RU/KK/EN/zh-CN launch copy; its deterministic unsupported-intent recognition
  is Unicode-normalized and recognizes the four launch languages;
  deterministic moderation external-link host comparison now uses locale-neutral
  case normalization rather than Turkish collation, preserving its existing
  anti-fraud and privacy contract;
- formatting and shared enum labels: `src/lib/format.ts` vehicle enum labels
  migrated to the canonical `format.enumLabels` dictionary domain; known future
  locale identities now flow through market-specific Intl date, number, and
  currency formatting (with direct translated no-data fallbacks) rather than
  being narrowed to the released Turkish/English registry; direct Russian,
  Kazakh, and Simplified Chinese labels now cover every shared vehicle enum
  group, while released Turkish/English labels remain on their existing
  dictionary path;
- service pricing: absent offering currency now delegates to the active market
  formatter rather than injecting legacy TRY; explicitly stored historical
  currencies remain displayed as provided;
- seller wizard pricing: new drafts, missing legacy listing currencies, and the
  currency selector now source the active market currency code (KZT), while an
  explicitly stored historical currency is preserved during edit;
- seller wizard location: the empty new-listing city fallback now uses the
  active Kazakhstan location dataset instead of a legacy Turkey city list;
- seller wizard profile fallback: absent country and timezone now source the
  active market profile (KZ and Asia/Almaty) without altering stored seller
  profiles;
- seller AI assistance: its authenticated request schema, deterministic
  question/description templates, and ambiguity recognition now accept the
  prepared RU/KK/EN/zh-CN launch set without negotiating or exposing future
  locale routes; the existing authenticated write boundary is unchanged;
- city presentation: popular-city ordering now uses the selected locale's
  configured collation instead of a hard-coded Turkish collation;
- profile fallback: an absent profile now uses active-market KZ country metadata
  and configured Kazakhstan city choices rather than Turkey defaults;
- profile timezone fallback is now likewise owned by the active market profile
  (Asia/Almaty for Kazakhstan), leaving existing stored profiles unchanged;
- deterministic listing-text moderation now recognizes active Kazakhstan +7
  and domestic 8-prefixed phone numbers as contact details, retaining the
  historical Turkey matcher only for the Turkey market profile;
- service application: its blank-form city default now reads the configured
  Kazakhstan location dataset instead of Istanbul;
- API validation and metadata: locale validation in API routes plus all
  canonical, hreflang, sitemap, and metadata route producers.

The inventory is intentionally source-specific: all of these must move to
canonical dictionary/locale helpers in coherent domain slices. No locale
registry release is authorized until each affected surface has real Russian,
Kazakh, English, and Simplified Chinese coverage with Russian fallback behavior.
