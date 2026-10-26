# RC3A final production migration pre-apply audit — 2026-10-26

## Scope and target

Read-only audit only: no migration, DDL, DML, Auth/provider change, deployment,
or SMS action was performed. The linked CLI queried the canonical production
project `dmjifqbvbjewyigdsuco` only.

- HEAD: `69174976ad50a002c341de5946e37862f106f28d`
- worktree: clean at audit start
- CLI state: **180 local migration versions**, **172 remote versions**, and
  **8 pending local-only versions**. Remote history ends at
  `20261021173638`.
- The repository has 181 `.sql` files; its deployment authority is the
  Supabase CLI's 180-version inventory. The extra file count is not treated as
  an extra pending migration.

## Pre-migration production facts

The production catalog shows the expected pre-migration baseline:

- `marketplace.cities`, listings, search documents, video analytics, and dealer
  import relations exist with RLS enabled where applicable.
- Cities have `country_code`, `is_active`, and `name`; listings have `city_id`,
  `currency`, seller, lifecycle, and archive fields.
- The current public search policy is unconditional and public home/detail
  views have no KZ city join. The JLC-0521 guard function and JLC-0522 trigger
  are absent, exactly as expected.
- `legal_document_acceptances` is absent.
- Video analytics currently allows only `tr` and `en` locales.
- The dealer Excel function is in the exact pre-hardening form: seller-scoped,
  not KZ/KZT bound, no variable-conflict directive, and using the old archive
  lifecycle. `listing_status` includes `removed`.

## Application plan

| Order | Version / filename | Classification | Dependencies | Expected effect | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | `20261021182338_jlc_0521_kazakhstan_public_read_isolation.sql` | SAFE_REPLACE | Current cities/listings/search documents/views | Trusted KZ city predicate; KZ-only search policy/matcher; KZ-filtered public home/detail views | READY_TO_APPLY |
| 2 | `20261022064213_jlc_0522_kazakhstan_seller_write_isolation.sql` | SAFE_SECURITY_HARDENING | 1; listings city/currency fields | BEFORE insert/market-field trigger requires KZ city and KZT | READY_TO_APPLY |
| 3 | `20261022065255_jlc_0523_video_analytics_locale_contract.sql` | SAFE_REPLACE | Existing video analytics constraint/RPC | Expands locale allowlist to `ru`, `kk`, `en`, `zh-CN` while retaining `tr`, `en` history | READY_TO_APPLY |
| 4 | `20261025120000_jlc_0523_legal_acceptance.sql` | SAFE_ADDITIVE | Auth users schema | Append-only legal acceptance table, RLS and own-row policies | READY_TO_APPLY |
| 5 | `20261026001543_jlc_0523_harden_legal_acceptance_grants.sql` | SAFE_SECURITY_HARDENING | 4 | Explicit deny-by-default grants; authenticated SELECT/INSERT only; service role intentional | READY_TO_APPLY |
| 6 | `20261026103000_jlc_0110_dealer_import_kz_city_binding.sql` | SAFE_REPLACE | 1; existing dealer import tables/function | Replaces dealer Excel import with active KZ-city/KZT/seller-scoped behavior | READY_TO_APPLY |
| 7 | `20261026104000_jlc_0110_dealer_import_column_binding.sql` | SAFE_REPLACE | 6; exact pre-hardening function delimiter | Replaces function with deterministic column-binding directive | READY_TO_APPLY |
| 8 | `20261026105000_jlc_0110_dealer_import_archive_lifecycle.sql` | SAFE_REPLACE | 7; `listing_status.removed` | Replaces obsolete archival status with current removed/archived lifecycle | READY_TO_APPLY |

No migration performs a data backfill, deletes rows, transforms historical TR
records, weakens RLS, or changes Auth configuration. The video constraint is
replaced transactionally; existing rows satisfying the old `tr/en` constraint
also satisfy the expanded constraint. The seller-write trigger only constrains
inserts and city/currency changes, leaving unrelated historical TR lifecycle
updates untouched.

## Critical boundaries

- **JLC-0521:** pre-state confirms the exact security gap it closes: direct
  search policy and public views currently lack KZ predicates. All referenced
  search-document columns and city relationship prerequisites exist. The
  migration creates/replaces only guard/read objects and preserves TR rows.
- **JLC-0522:** current authenticated draft/edit RPCs use `auth.uid()` but
  accept city/currency without the KZ guard. The migration's table trigger is
  therefore the correct universal DB boundary for draft, edit, submit/resubmit,
  dealer import, and legacy mutation paths.
- **Legal acceptance:** final chain permits authenticated own SELECT/INSERT,
  denies anon persistence and application-role update/delete, and keeps
  intentional service-role administration. It is additive.
- **Dealer imports:** the new function resolves only active KZ cities, binds
  KZT, verifies ownership, and rejects market-mismatched legacy mappings. The
  following two migrations require and matched the exact production pre-state.

## Security Advisor

Current Advisor findings were read. They do not invalidate the eight-migration
chain, but remain release work:

- `public.service_admin_provider_applications` SECURITY DEFINER view: expected
  architecture / defense in depth for this migration run. It is not anon
  readable and its definition filters through `is_admin(auth.uid())`; the
  JLC-0520 helper functions are SECURITY DEFINER with fixed search path and
  self-scoped caller arguments.
- Legacy mutable-search-path warnings: post-launch hardening review; none are
  modified by this chain.
- Anon/authenticated SECURITY DEFINER RPC warnings: expected architecture only
  where a fixed search path and internal auth/ownership contract are verified.
  They were not blanket-revoked because that would break RPC/RLS behavior.
- Leaked password protection disabled: provider setting and GO-LIVE blocker;
  unrelated to migration application.

## Required post-application verification

1. Re-run `supabase migration list --linked`: 180/180, no pending local-only
   versions.
2. Read back the new functions, trigger, views, policies, legal table/grants,
   analytics constraint, and dealer import definition; confirm exact expected
   post-state.
3. Run current local regression: `test:jlc-0521`, `test:jlc-0522`,
   `test:security-final-media-reference`, JLC-1508, typecheck, lint, build.
4. Under separate authorization, run controlled production smoke using approved
   pre-existing actors/data: KZ public reads must not expose TR; known TR IDs
   must fail closed; seller/dealer writes cannot change market; legal evidence
   is own-row/append-only; dealer imports reject non-KZ city input.

## Go/no-go

The eight SQL files are individually compatible with the verified production
pre-state and their combined chronological dependency order is safe. They are
ready for a separately authorized application pass. This does not authorize
application, runtime smoke, deployment, or GO-LIVE.
