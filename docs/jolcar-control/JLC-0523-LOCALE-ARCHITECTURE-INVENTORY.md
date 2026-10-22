# JLC-0523 — Four-language localization architecture inventory

Russian, Kazakh, English, and Simplified Chinese must be converted as one
typed application contract before their registry release. The following source
areas contain embedded `tr/en` maps outside the canonical dictionaries and
must be migrated by domain slice:

- shared layout: `LanguageSwitcher.tsx` (migrated to registry labels in the
  first slice)
- listing reporting: `ReportListingButton.tsx`
- seller listing/video flows: `ListingVideoManager.tsx`, `my-listings-copy.ts`
- seller wizard and AI assistance: `ListingDescriptionAssistant.tsx`,
  `SellAssistant.tsx`, `sell-copy.ts`, `features/ai/sell/sell-draft.ts`
- formatting: `src/lib/format.ts`

Additional legacy comparisons and local maps are identified through the
TypeScript four-locale activation check and must be migrated in the prescribed
domain order. No locale registry release is authorized until each affected
surface has canonical dictionary coverage and Russian fallback behavior.
