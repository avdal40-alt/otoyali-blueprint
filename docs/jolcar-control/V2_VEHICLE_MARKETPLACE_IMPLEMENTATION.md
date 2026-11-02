# Vehicle Marketplace V2 — local implementation record

## Scope and safety

The owner approved Vehicle Marketplace V2 on 2026-11-02. This supersedes the
old JLC-A005 deferral only for Kazakhstan classifieds/lead-generation support
for `sale` and `rent`, plus `passenger_car`, `truck`, `bus`, `trailer`, and
`special_machinery` listings. Marketplace payments, escrow, booking calendars,
deposit handling, billing, and paid streaming remain out of scope.

Production remains **PAUSED**. No V2 migration has been applied to canonical
Supabase project `dmjifqbvbjewyigdsuco`, and no Vercel deployment was made.

## Local schema chain — pending controlled review

1. `20261102120000_vehicle_marketplace_v2_foundation.sql`
   - category and purpose enums;
   - separate rental terms with mandatory daily KZT price;
   - one-to-one category details protected by RLS.
2. `20261102121000_vehicle_marketplace_v2_protected_drafts.sql`
   - protected `create_own_listing_draft_v3` boundary;
   - KZ seller-contact enforcement, staff exclusion, catalog/city/district
     checks, category-aware validation, and no sale-price overload for rent.
3. `20261102122000_vehicle_marketplace_v2_public_projection.sql`
   - existing KZ-only public search projection extended for V2;
   - category/purpose and rental price terms projected without contacts or
     other private data; search/count retain one matcher and KZ city boundary.
4. `20261102123000_vehicle_marketplace_v2_edit_admin.sql`
   - protected owner-only V2 draft/rejected edit boundary with optimistic
     locks, seller-phone enforcement, and category/purpose-preserving pricing
     validation.
5. `20261102124000_vehicle_marketplace_v2_admin_projection.sql`
   - staff-only moderation projection extended with V2 category, purpose,
     rental terms, and category-detail fields; seller contact remains private.

Verified local isolated baseline after application: **187 local / 182 canonical
remote / 5 pending for canonical**. The database must be reviewed and applied as one ordered V2
chain in a separate authorized operation. Do not deploy the current runtime to
staging until that schema gate is complete.

## Implemented local foundation

- Backward-compatible passenger-car sale defaults.
- V2 Zod/server contract and dedicated `/api/listings/v2` endpoint; legacy
  passenger `/api/listings` remains unchanged.
- Category-aware public listing types and cards; rent displays a daily KZT
  price rather than a misleading sale price.
- Search request contract preserves the existing engine and matching/count
  semantics while accepting category/purpose and rental criteria after the
  pending projection migration.
- The category/purpose boundary retains JLC-0524’s verified Kazakhstan seller
  contact requirement, with no change to international account registration or
  password login.

## Application layer completed in this local wave

- The seller wizard now selects vehicle category and listing purpose before
  creating a listing. Non-legacy combinations use the explicit `/api/listings/v2`
  boundary and the protected V3 database RPC; the legacy passenger-car sale
  endpoint remains unchanged.
- The wizard renders category-aware fields for truck, bus, trailer, and special
  machinery. Trailer creation deliberately omits engine, fuel, transmission,
  and mileage. Rental creation uses a mandatory KZT daily price and optional
  monthly price, minimum duration, seller-provided deposit information, and
  driver/operator availability.
- The home and full search surfaces expose category and purpose. Rental filters
  survive URL serialization, count requests, pagination, and saved-search
  requests. The saved-search API now accepts only the same V2 filter keys
  recognized by the database matcher.
- Listing cards and public details distinguish sale from rent, show a daily
  rental price without overloading sale price, omit trailer-inapplicable engine
  chips, and show rental terms with the correct classifieds disclaimer.

## Remaining V2 implementation before controlled schema application

- **V2 edit UI:** the protected V2 save RPC and API route now exist, but the
  seller’s existing rejected-listing editor still needs a V2-specific loader
  and form hydration path. It must not fall back to the passenger-only edit
  writer because that would omit category/rental terms.
- **Moderation actions:** the staff-only moderation reader and list UI now
  project V2 category/purpose and correct rental price semantics. A manual
  local role-backed review of every category remains required before release.
- **Dealer import:** the current bounded Excel importer has a
  passenger-only required-header contract. Commercial/rental mappings must be
  added together with a protected dealer apply boundary; no inference from
  missing import fields is allowed.
- **Runtime matrix:** the ten-combination create/edit/submit/resubmit/search/
  count/favorite/saved-search/moderation/dealer evidence requires a controlled
  non-production database with the three pending migrations applied. Canonical
  production remains untouched.

## Verification completed locally

- `npm run test:vehicle-marketplace-v2-foundation` — PASS
- `npm run test:vehicle-marketplace-v2` — PASS
- `npm run test:jlc-0519` — PASS
- `npm run test:jlc-0521` — PASS
- `npm run test:jlc-0522` — PASS
- `npm run test:seller-country-phone-eligibility` — PASS
- `npm run test:country-config` — PASS
- `npm run test:security-final-media-reference` — PASS
- `npm run test:jlc-0514` — PASS
- `npm run test:jlc-0907` — PASS
- `npm run test:listing-edit-payload` — PASS
- `npm run test:listing-contact-edit-flow` — PASS
- `npm run typecheck` — PASS
- `npm run lint` — PASS with the unchanged SafeImage `<img>` advisory
- `npm run build` — PASS

## Release state

`PREVIEW_STATUS = BLOCKED_BY_PENDING_MIGRATIONS`

This is deliberate. A Preview against the canonical 182-migration schema would
not contain the V2 RPC, public projection fields, or constraints and must not
be used as evidence of V2 runtime behavior.

## Current local decision

`V2_LOCAL_APPLICATION_STATUS = PARTIAL — CREATE/DISCOVERY/DETAIL/PROTECTED
EDIT/MODERATION PROJECTION/SAVED-SEARCH WIRED; V2 EDIT UI, DEALER IMPORT, AND
THE AUTHENTICATED TEN-COMBINATION RUNTIME MATRIX REMAIN`.

No V2 migration has been applied, no canonical data has changed, and the
canonical project remains at **182** remote migrations.
