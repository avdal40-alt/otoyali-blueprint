# Nightly roadmap implementation-wave audit

**Date:** 2026-11-02 (Asia/Qyzylorda)
**Baseline:** `1cdffa3f2aa9e5c24de33a6d87d62d10b15eaced` on `jolcar/autonomous`
**Canonical Supabase:** `dmjifqbvbjewyigdsuco`
**Production:** paused and unchanged.

## Decision boundary

The controlling product records do not authorize an additional listing vertical
in this wave. `MASTER_PLAN.md` §21 puts **RENT** and additional vehicle
verticals in approved future scope, not the first web launch. The runnable
queue makes the implementation gate unambiguous: `JLC-A005` is
`backlog_post_launch`, titled “Additional vehicle verticals / parts / services
/ insurance / RENT planning”, and requires a **separate user-approved scope
per vertical** before implementation.

The nightly instruction correctly required repository evidence before work. No
such per-vertical approval, taxonomy, rental price semantics, or category
moderation contract exists in the controlling records. Enabling a category,
adding a purpose, or creating schema without those decisions would invent
product scope and risk unsafe public/migration behavior. No new migration was
created and no remote database operation was made.

## Evidence inventory

| Capability | Evidence | Current implementation | Classification | Action in this wave |
| --- | --- | --- | --- | --- |
| Passenger-car sale marketplace | Active `cars` vertical; current listing RPCs, Search v1, seller wizard, media, moderation, dealer inventory and RC4C evidence | Complete active vertical | COMPLETE | Regression protected |
| Rental / аренда | `MASTER_PLAN.md` §21 and `JLC-A005` call RENT future/post-launch; no `listing_purpose`, rental-rate, availability, booking, or rental validation contract exists in code/migrations | No implementation or skeleton | DEFERRED | Needs a separate rental scope decision; lead-generation only unless later approved otherwise |
| Commercial transport | `commercial` registry entry, localized landing and attribute metadata (`vehicle_subtype`, payload, axle count, gross weight, cabin); its route is `coming_soon`, non-indexable, non-searchable and non-publishable | Presentation/domain skeleton only; no listing persistence, protected write, Search v1 projection/filter, moderation or dealer-import contract | SKELETON / DEFERRED | Preserve guard; needs exact taxonomy and scope approval |
| Marine / parts / services / insurance | Registry, localized future landings and attribute metadata; services also has its separate service-provider foundation | Coming-soon category scaffolding, not marketplace-listing verticals | SKELETON / DEFERRED | No activation without individual scope approval |
| Motorcycles / machinery / mobility | Registry and localized metadata only; all are explicitly `disabled` | Placeholder domain vocabulary | PLANNED / DEFERRED | No implementation |
| Dealer Live / paid AI / voice | Existing reusable foundations are documented, but first MVP explicitly defers live and paid external activation | Preserved, disabled/deferred | DEFERRED | Not touched |

## Existing domain boundary

The repository already has the correct reuse seam for a later vertical:

`MarketplaceVerticalConfig` → attribute/filter metadata → future route and
localized landing → existing marketplace primitives.

Only `cars` is active. The current seller wizard, public search/count,
saved-search matcher, listing projections, listing details, favorites,
moderation, and dealer import are all passenger-sale contracts. The current
non-car records deliberately advertise `coming_soon`/`disabled`; they do not
claim inventory, publishing, public search, or SEO indexing. This is the safe
state to keep until a full vertical slice has approved data, lifecycle,
moderation, price semantics, search/count, dealer-import, and security
contracts.

The existing `MarketplaceVerticalId` vocabulary (`commercial`, `marine`,
`parts`, `services`, `insurance`, `motorcycles`, `machinery`, `mobility`) is
not approval to implement any one of those categories. It is reusable planning
metadata. Likewise, AI image-moderation fixture labels such as
`commercial_van` and `motorcycle` are classifier fixtures, not vehicle catalog
or seller-publish support.

## Safe work completed

- Reconciled the canonical migration history read-only: **182 local / 182
  remote / 0 pending**. The last migration is the already-applied JLC-0524;
  this wave did not change canonical data or schema.
- Audited the vertical registry, attributes, future landings, sell gate,
  search metadata, service vertical metadata, current migrations and the
  controlling plan/queue/decisions.
- Corrected `apps/web/scripts/stabilization-02.test.cjs`, whose old assertion
  still expected the Turkey-specific `tr_TR` OpenGraph fallback. It now asserts
  the market-owned locale fallback and confirms future verticals remain
  `coming_soon`/`disabled` and non-indexable. This is a regression-test repair,
  not an application behavior change.
- No rental/commercial listing code, public route activation, migrations,
  RLS policies, database data, provider configuration, Preview deployment, or
  production action was created.

## Verification

Passed after the test repair:

- `test:stabilization-02`
- `test:vertical-page-localization`
- `test:country-config`
- `test:jlc-0519`
- `test:jlc-0521`
- `test:jlc-0522`
- `test:seller-country-phone-eligibility`
- `test:security-final-media-reference` (22 authorization checks)
- `typecheck`
- `lint` (only the already-known `SafeImage` raw-`img` advisory)
- `git diff --check`

## Required decision before the next implementation wave

The owner must select **one** vertical and approve its exact product contract.
For rental that means at least: vehicle eligibility/taxonomy, lead-generation
only confirmation, price unit and currency semantics, availability language,
required/optional attributes, seller/dealer rules, moderation policy,
search/filter facets, SEO and launch timing. For commercial transport that
means the exact category taxonomy (not example categories), mandatory
attributes, category-specific safety/moderation rules, price semantics,
dealer-import mapping, and launch surface.

After that decision, the safe next engineering task is a narrowly scoped,
local-only vertical proposal with a schema/RLS review before any migration is
created. New migration(s) must remain local until separately authorized for a
canonical application.

## Morning review

1. **Found:** passenger-car sale is complete; a reusable but intentionally
   disabled/coming-soon vertical registry and localized landing skeleton exists.
2. **Implemented overnight:** no unapproved vertical. Repaired a stale
   Turkey-default regression assertion and strengthened the guard that future
   verticals cannot silently become public/indexable.
3. **Migrations created but not applied:** none.
4. **Manual UI testing:** none for unimplemented verticals. Existing
   passenger-car manual smoke remains governed by the V9/V10 release evidence.
5. **Owner decision:** select and approve one vertical’s exact contract.
6. **What to apply next:** nothing to staging/canonical from this wave.
7. **Exact safest next action:** approve a single scoped product brief for
   either rental or commercial transport before implementation begins.
