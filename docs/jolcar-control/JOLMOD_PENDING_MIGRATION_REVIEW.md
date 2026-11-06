# JOLMOD pending migration replay review

Date: 2026-11-06

## Scope and safety

- Repository baseline: `813940deb2376eb004622a5a19db3d5846aeacd1` on `jolcar/autonomous`.
- CLI: Supabase `2.115.0`.
- Canonical project was not linked, queried for SQL, or changed. All database work was local disposable Docker state.
- Remote migration history had previously established 182 applied migrations; the local baseline replay ended at `20261101130000_jlc_0524_kazakhstan_seller_phone_eligibility.sql`.

## Replay evidence

Database A was reset with exactly the first 182 migration files. The pending files were returned to its migration directory and applied one at a time with `supabase migration up --local --yes`.

| # | Migration | Result |
|---:|---|---|
| 01 | `20261102120000_vehicle_marketplace_v2_foundation.sql` | PASS |
| 02 | `20261102121000_vehicle_marketplace_v2_protected_drafts.sql` | PASS |
| 03 | `20261102122000_vehicle_marketplace_v2_public_projection.sql` | PASS |
| 04 | `20261102123000_vehicle_marketplace_v2_edit_admin.sql` | PASS |
| 05 | `20261102124000_vehicle_marketplace_v2_admin_projection.sql` | PASS |
| 06 | `20261102125000_vehicle_marketplace_v2_public_details_boundary.sql` | PASS |
| 07 | `20261103120000_vehicle_marketplace_v2_edit_hydration.sql` | PASS |
| 08 | `20261103130000_vehicle_marketplace_v2_dealer_import.sql` | PASS |
| 09 | `20261103140000_vehicle_marketplace_v2_draft_rpc_variable_conflict.sql` | PASS |
| 10 | `20261103150000_parts_marketplace_foundation.sql` | PASS |
| 11 | `20261104120000_jlc_1604_insurance_interest_leads.sql` | PASS |
| 12 | `20261104124638_jlc_1606_restore_buyer_request_notifications.sql` | PASS |
| 13 | `20261104130000_jlc_1605_specialty_marketplace.sql` | PASS |
| 14 | `20261104172413_jlc_1606_fix_v2_edit_status_filter.sql` | PASS |
| 15 | `20261104172835_jlc_1606_restore_v2_edit_legacy_fallback.sql` | PASS |
| 16 | `20261104180000_jlc_1606_profiles_anon_privilege_hardening.sql` | PASS |

Database B was a separate local instance initialized from zero using all 198 migration files. Its normalized `pg_dump --schema-only --no-owner --no-privileges` SHA-256 was identical to Database A after the 182-to-198 replay. Generated pg_dump restrict/unrestrict tokens were normalized; rows and migration-history metadata were not compared.

## Runtime checks completed

- JLC-0405: PASS.
- JLC-0804: PASS.
- V2 static, runtime matrix, and edit: PASS.
- Dealer import static contract: PASS.
- Parts, insurance, and specialty web-scope contracts: PASS.
- SECURITY-04A runtime and profile isolation: PASS.
- Direct anonymous `public.profiles` select was exercised through the local security suite; direct profile mutation attacks were denied.

## Remaining gate limitations

This run did not load a durable representative pre-upgrade fixture graph into the 182-migration database before applying the pending migrations. The V2 runtime harness creates equivalent synthetic rows transactionally after replay, but that is not a substitute for the required persisted pre-upgrade fixture integrity check.

`npm run test:jlc-1302` started successfully and passed its early constituent checks, but its local-auth lifecycle exceeded the available foreground command window before a final aggregate outcome. It is therefore recorded as incomplete, not passed.

The current-head typecheck, lint, build, and diff-check gates were not run in this replay session.

## Operational notes

Migrations 01 and 03 alter/search-index listing structures. Their static deployment lock risk remains medium: ordinary `CREATE INDEX` is transactional and can block writers, while table alteration duration depends on existing data volume. Use a low-traffic window for any later isolated staging or production execution; no duration estimate was made.

## Decision

- `REMOTE_EQUIVALENT_BASELINE`: PASS (schema migration history).
- `PENDING_UPGRADE_PATH`: PASS.
- `LOCAL_SCHEMA_FROM_ZERO`: PASS.
- `FINAL_SCHEMA_EQUIVALENCE`: PASS.
- `POST_UPGRADE_DATA_INTEGRITY`: NOT COMPLETELY VERIFIED (durable baseline fixture graph missing).
- `RUNTIME_RLS_SECURITY`: PARTIAL PASS (targeted tests passed; full required fixture matrix incomplete).
- `TECHNICAL_MIGRATION_REVIEW`: NO_GO pending the durable baseline-fixture integrity check, full JLC-1302 completion, and application compatibility gates.
- `STAGING_SUPABASE_PROJECT_REF`: NOT_PROVEN.
- `STAGING_DB_ISOLATION`: NOT_PROVEN.

## V12C closeout

On the same CLI-pinned, unlinked localhost workflow, a fresh 182-migration
baseline was populated with deterministic synthetic QA rows: Auth users and
their trigger-created profiles, a verified seller contact, a verified dealer
profile, an owner-created passenger draft, a Buyer Request, and a saved
search. The graph was created through the existing owner-draft RPC and normal
constraints; no constraint or RLS policy was disabled. All sixteen pending
migrations then applied in order and every recorded relationship remained
present and valid after the 198-schema upgrade.

- Durable pre-upgrade fixture graph: PASS.
- Durable fixture upgrade path: PASS.
- Durable post-upgrade integrity: PASS.
- JLC-1302 aggregate: PASS.
- Profile anonymous hardening / SECURITY-04A: PASS.
- Typecheck: PASS.
- Lint: PASS with the pre-existing `SafeImage` no-img advisory.
- Production build: PASS.
- Diff check: PASS.

The application compatibility checks cover V2 listing/search/edit contracts,
dealer workflows, Buyer Requests, parts, insurance, and specialty scope.
Accordingly, `TECHNICAL_MIGRATION_REVIEW` is **GO**. This is local SQL
approval only: the staging project reference and database isolation remain
unproven, so staging and production application remain blocked.
