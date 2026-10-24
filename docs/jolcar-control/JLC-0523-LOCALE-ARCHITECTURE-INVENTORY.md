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
  password login and normalized authentication errors now use scoped direct
  RU/KK/EN/zh-CN copy, preserving Kazakhstan +7 parsing and the existing
  password-only normal-login path. OTP registration, verification, resend,
  recovery, and password enrollment/reset now use the same direct launch-copy
  contract; deterministic coverage verifies complete keys and valid UTF-8
  Simplified Chinese without changing OTP eligibility or return paths;
- homepage/search/saved-search: `features/ai/search` language-recognition
  rules remain (`HomeTrustSection.tsx`, `SeoEntryLinks.tsx`,
  `ActiveFilterChips.tsx` UI labels, `SearchBar.tsx`, `SavedSearchButton.tsx`,
  `SearchFilters.tsx`, and AI Search result, availability, clarification, and
  catalog-validation messages migrated to canonical dictionary domains;
  Kazakhstan price and mileage semantic recognition now covers Russian,
  Kazakh, English, and Simplified Chinese KZT/tenge terms (including minimum
  and maximum price/mileage thresholds, the
  English `tenge` spelling and Russian/Kazakh/Chinese maximum-threshold wording); its in-memory
  parser keeps a mileage threshold from being misclassified as a price threshold,
  and the normal search URL/request/UI boundary preserves both mileage bounds,
  and fallback city-option ordering now uses the selected locale's collation,
  and its listing query/city filter no longer applies Turkish normalization or collation;
  AI Search result, availability, clarification, and catalog-validation
  messages now have direct RU/KK/EN/zh-CN dictionary coverage; deterministic
  reset, comparison, threshold, fuel, transmission, media, and sorting intent
  (including highest-price, lowest-mileage, and newest-model-year sort requests)
  recognition (including inclusive and exclusive year bounds, color and full body-type taxonomy, condition, seller type, semi-automatic/robot transmission, and drivetrain terms) now covers
  the same four launch languages without changing the
  Kazakhstan search catalog or market context; remaining legacy
  value-formatters remain for the four-real-dictionary expansion);
- listing cards and dealer detail: `VehicleCard.tsx` (migrated: the video badge
  now uses canonical common dictionary copy), `ReportListingButton.tsx`
  (migrated to dictionaries in the first slice), and `ShareListingButton.tsx`
  (migrated: copied-link feedback uses the canonical listing dictionary);
  `app/dealer/[id]/page.tsx` now uses the canonical `profile.dealerPage`
  dictionary domain for its profile, tabs, empty, post, listing, and live UI;
  other listing/detail controls remain;
- public listing-detail page: `app/listing/[id]/page.tsx` now consumes the
  scoped `listing-detail-copy.ts` contract for all server-rendered listing
  labels, video, seller, review-link, and empty-state copy. Russian, Kazakh,
  English, and Simplified Chinese are direct complete dictionaries; the
  inactive global registry is not used as a Turkish fallback for this page.
  Interactive detail controls remain separately scoped for their own direct
  coverage slices;
- listing-detail buyer contact: `ContactSellerButton.tsx` now uses scoped
  Russian, Kazakh, English, and Simplified Chinese copy for loading,
  authenticated-contact errors, and service-environment failures. Its existing
  login redirect, authenticated API request, and server-side contact policy are
  unchanged;
- seller listing/video flows: `ListingVideoManager.tsx`,
  `my-listings-copy.ts` (migrated: the seller listing UI and safe lifecycle
  error mapper now use the canonical `myListings` dictionary domain rather
  than an embedded `tr/en` map), `MyListingsClient.tsx`, `SellerContactsClient.tsx`
  (migrated to `profile.sellerContacts`),
  rejected edit flows, and seller contact error handling;
- seller wizard and AI assistance: `ListingDescriptionAssistant.tsx`
  (migrated to the canonical `ai.sellDescription` domain, including accessible
  preview-label copy), `SellAssistant.tsx` (migrated to canonical
  `ai.sellAssistant` copy, including field labels), `SellWizard.tsx`
  (the full Russian, Kazakh, and Simplified Chinese SellCopy contracts now have
  direct lifecycle, validation, media, seller-contact, pricing, and moderation
  copy without Turkish fallback),
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
  dictionary path; the formatter gate now verifies each RU/KK/EN/zh-CN
  configured Intl locale for KZT currency, number, mileage, date, enum, and
  no-data output without changing market identity;
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
- profile overview and editing: `ProfileClient.tsx` now uses the scoped
  `profile-copy.ts` contract with complete direct RU/KK/EN/zh-CN copy for
  account data, verified-phone presentation, seller/dealer state, save and
  failure states, authenticated empty state, logout, and profile navigation;
  profile persistence, the active KZ market fallback, Kazakhstan city choices,
  and locale-preserving logout paths remain unchanged;
- favorites: `FavoritesClient.tsx` now uses `favorites-copy.ts` with direct
  RU/KK/EN/zh-CN copy for unavailable configuration, load failure, and the
  empty search CTA; the authenticated favorite query, signed-media handling,
  and locale-preserving login return path remain unchanged;
- saved searches: management and search-page creation now use the scoped
  `saved-search-copy.ts` contract with direct RU/KK/EN/zh-CN copy for loading,
  unavailable/error/login states, cards, save/delete actions, and alert state;
  canonical request payloads, API ownership boundaries, matching semantics,
  and locale-preserving login return paths remain unchanged. Saved-search
  alert and canonical-target runtime fixtures now select active KZ cities and
  KZT so they remain compatible with the existing JLC-0522 listing-market
  guard;
- notifications: `NotificationsClient.tsx` now uses `notifications-copy.ts`
  with direct RU/KK/EN/zh-CN copy for read state, actions, pagination, empty,
  unavailable, and login states plus all active notification kinds; timestamps
  continue to use canonical locale metadata and links retain the selected
  locale. Chat and matching-notification runtime fixtures now select active KZ
  cities and KZT, preserving the existing JLC-0522 market-write guard;
- global shared shell: `global-launch-shared-copy.ts` now defines complete
  direct RU/KK/EN/zh-CN `common`, `navigation`, and `footer` contracts for the
  header, mobile navigation, footer, dialogs, and common state controls. Its
  deterministic gate requires the exact historical section shape, Jolmod/KZ
  public identity, direct resolution for every launch locale, Turkish
  exclusion, and valid non-corrupted Simplified Chinese source. This is a
  staged global-loader foundation only: registry activation remains blocked
  until the remaining active global domains (including home and search) have
  equally direct coverage;
- global home: `global-launch-home-copy.ts` now supplies direct RU/KK/EN/zh-CN
  copy for the remaining global homepage contract, including KZ city/search
  entry presentation, loading and empty states, trust content, and app CTA.
  Its contract gate enforces exact key parity, Kazakhstan identity, direct
  launch resolution, Turkish exclusion, and Simplified Chinese integrity;
- global search: `global-launch-search-copy.ts` now supplies direct RU/KK/EN/
  zh-CN copy for every remaining canonical search key; exact-shape and Chinese
  integrity gates prevent Turkish fallback or placeholder launch copy.
- global-loader foundation: `getJolmodGlobalDictionary()` composes only the
  prepared shared-shell, home, and search launch contracts. It resolves every
  supported Jolmod launch locale directly and defaults unsupported values to
  Russian, never Turkish. This remains preparatory: active client consumers of
  further legacy sections must be migrated before registry activation.
- listing actions: `listing-actions-copy.ts` now gives VehicleCard photo
  navigation and publication metrics plus the share and report controls direct
  RU/KK/EN/zh-CN copy. The compact adapter defaults unsupported Jolmod values
  to Russian and never selects Turkish. Listing routes, report persistence and
  authorization, sharing mechanics, listing-detail/contact contracts, and KZ
  public-read and seller-write isolation remain unchanged.
- seller entry and contact verification: the sell page and the active seller
  entry/contact OTP components now use `sell-entry-copy.ts` for direct
  RU/KK/EN/zh-CN entry, eligibility, rate-limit, and verification feedback.
  Existing complete `SellCopy` remains the wizard source, now with Russian as
  its unsupported Jolmod fallback while explicit Turkish support remains
  available. The copy preserves Kazakhstan +7 presentation; seller-contact
  request endpoints, return paths, eligibility flow, and JLC-0522 write
  isolation are unchanged.
- profile seller contacts: seller-contact management now uses a scoped direct
  RU/KK/EN/zh-CN contract for loading, capacity, account-number, retry, and
  add/cancel states. The existing verified-contact RPCs and account-phone sync
  remain unchanged. Profile helper fallback now resolves unsupported Jolmod
  locales through Russian while explicit Turkish compatibility is retained.
- Kazakhstan SEO and route generation: the active KZ market now owns explicit
  Russian, Kazakh, English, and Simplified Chinese sitemap/robots route
  families, with Russian unprefixed and the other three safely prefixed. Shared
  sitemap/robots producers no longer add legacy Turkey vertical routes to a KZ
  build. The root metadata source has direct KZ-language titles, descriptions,
  Open Graph locales, canonical/alternate helpers, Russian fallback, and a
  source-level Simplified Chinese integrity check. Turkish remains absent from
  KZ SEO output; middleware/registry activation is still deliberately blocked
  by the unfinished global client dictionary domains.
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
