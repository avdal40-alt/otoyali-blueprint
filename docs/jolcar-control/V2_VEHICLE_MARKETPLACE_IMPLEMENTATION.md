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

Verified next controlled baseline before application: **185 local / 182 remote
/ 3 pending**. The database must be reviewed and applied as one ordered V2
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

## Remaining V2 implementation before release

- Complete category/purpose selection and conditional field rendering in the
  seller wizard, including safe edit/resubmit contract support.
- Add launch-localized UI controls for commercial/rental search, seller,
  detail, account, dealer inventory, and moderation fields.
- Extend saved-search persistence/matching and dealer import mappings only
  where category/purpose data is supplied; preserve historical passenger
  imports.
- Add the full runtime matrix after the local schema chain is applied in a
  controlled non-production environment: all ten category/purpose combinations,
  owner isolation, moderation, favorites, saved searches, dealer flows, and
  responsive UI.

## Verification completed locally

- `npm run test:vehicle-marketplace-v2-foundation` — PASS
- `npm run test:vehicle-marketplace-v2` — PASS
- `npm run test:jlc-0519` — PASS
- `npm run test:jlc-0521` — PASS
- `npm run test:jlc-0522` — PASS
- `npm run test:seller-country-phone-eligibility` — PASS
- `npm run test:country-config` — PASS
- `npm run test:security-final-media-reference` — PASS
- `npm run typecheck` — PASS
- `npm run lint` — PASS with the unchanged SafeImage `<img>` advisory
- `npm run build` — PASS

## Release state

`PREVIEW_STATUS = BLOCKED_BY_PENDING_MIGRATIONS`

This is deliberate. A Preview against the canonical 182-migration schema would
not contain the V2 RPC, public projection fields, or constraints and must not
be used as evidence of V2 runtime behavior.
