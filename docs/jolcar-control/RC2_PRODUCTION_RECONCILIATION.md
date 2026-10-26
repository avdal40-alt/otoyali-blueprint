# RC2 production Supabase reconciliation — 2026-10-26

## Boundary and target proof

This was a read-only inspection. No SQL was executed on production; no
migration, DDL, DML, Auth setting, provider setting, deployment, or secret was
changed.

The canonical target was re-verified before every attempted production read:

- ref: `dmjifqbvbjewyigdsuco`
- name: `avdal40-alt's Project`
- region: `ap-south-1`
- status: `ACTIVE_HEALTHY`

The distinct `uivazzvxelptjmbbfvir` / Otoyali project was not queried.

## Local release candidate

- branch: `jolcar/autonomous`
- HEAD at inspection: `1826f44b49a27120b1caa3cf991ca6b4cc69ee98`
- worktree: clean
- JLC-0523: `complete`; Jolmod launch registry is `ru`, `kk`, `en`, `zh-CN`,
  with Russian default/fallback and KZ/KZT invariant.
- RC1's fresh local critical regression/build evidence remains applicable; RC2
  changes no executable source.

## Canonical local migration inventory

`supabase/migrations`, lexically ordered by version, contains **181** files.
Filename is the canonical locally recorded purpose/JLC indicator; no filename
is treated as remote-parity proof.

Targeted entries:

| Version | File | Local purpose |
| --- | --- | --- |
| 20261019065851 | `jlc_0508_fix_draft_media_finalization.sql` | Draft-media finalization correction |
| 20261019165840 | `jlc_0512_allow_draft_cover_media.sql` | Draft cover media |
| 20261019175316 | `jlc_0514_admin_listing_moderation_read.sql` | Admin moderation read |
| 20261019185432 | `jlc_0516_verified_plate_privacy_outcomes.sql` | Plate-privacy outcomes |
| 20261020062103 | `jlc_0517_optional_listing_photos_cap.sql` | Optional-photo cap |
| 20261020180216 | `jlc_0519_staff_seller_dealer_boundary.sql` | Staff/seller/dealer boundary |
| 20261021173638 | `jlc_0520_admin_helper_self_scope.sql` | Admin-helper self scope |
| 20261021182338 | `jlc_0521_kazakhstan_public_read_isolation.sql` | KZ public read isolation |
| 20261022064213 | `jlc_0522_kazakhstan_seller_write_isolation.sql` | KZ seller write isolation |
| 20261022065255 | `jlc_0523_video_analytics_locale_contract.sql` | Video/analytics locale contract |
| 20261025120000 | `jlc_0523_legal_acceptance.sql` | Legal-acceptance evidence |
| 20261026001543 | `jlc_0523_harden_legal_acceptance_grants.sql` | Legal-acceptance grants |

Every local migration after JLC-0520, in required repository order:

1. `20261021182338_jlc_0521_kazakhstan_public_read_isolation.sql`
2. `20261022064213_jlc_0522_kazakhstan_seller_write_isolation.sql`
3. `20261022065255_jlc_0523_video_analytics_locale_contract.sql`
4. `20261025120000_jlc_0523_legal_acceptance.sql`
5. `20261026001543_jlc_0523_harden_legal_acceptance_grants.sql`
6. `20261026103000_jlc_0110_dealer_import_kz_city_binding.sql`
7. `20261026104000_jlc_0110_dealer_import_column_binding.sql`
8. `20261026105000_jlc_0110_dealer_import_archive_lifecycle.sql`

The full canonical local inventory is the 181-file ordered repository directory
`supabase/migrations`; it was enumerated during RC2. No local migration is
classified absent remotely without remote history.

## Remote migration access and parity

`supabase_list_migrations` and an explicitly read-only
`select version, name from supabase_migrations.schema_migrations order by version`
were attempted only after target proof. Both were rejected by the available
connector with `INVALID_ARGUMENT`. The local Supabase CLI is unavailable, no
canonical-project link metadata exists locally, and no usable local production
credential/session is present. The local `supabase/config.toml` is a local
blueprint configuration, not a canonical-production connection.

| Metric | Result |
| --- | --- |
| LOCAL_COUNT | 181 |
| REMOTE_COUNT | UNKNOWN |
| MATCHED_COUNT | UNKNOWN |
| LOCAL_ONLY_COUNT | UNKNOWN |
| REMOTE_ONLY_COUNT | UNKNOWN |
| timestamp/name logical equivalence | UNKNOWN |
| ordering/duplicate analysis | UNKNOWN |

Therefore **there are no verified migrations to apply next**. The eight entries
after JLC-0520 are candidates requiring ordered remote-history comparison; they
are not a migration plan yet.

## Legal acceptance

Local migrations `20261025120000` and `20261026001543` are additive. They create
`public.legal_document_acceptances` with a user/auth-user foreign key,
document-key allowlist, bounded document version, and timestamp; enable RLS;
allow authenticated users to select/insert only their own records; deny anon;
and make history immutable for application roles while retaining deliberate
service-role access. No existing user data is transformed.

**Remote status: UNKNOWN.** The table, RLS policies, grants, and migration
versions could not be read, so it is neither `ALREADY_REMOTE` nor
`LOCAL_ONLY_READY`.

## JLC-0521 and JLC-0522 remote comparison

Local JLC-0521 is an additive isolation layer: trusted KZ-city predicate,
KZ-filtered public search policy/views, and a fail-closed matcher for
saved-search/notification paths. Local JLC-0522 is an additive trigger that
requires a KZ city and KZT when city/currency is inserted or changed, leaving
unrelated historical TR lifecycle updates intact.

Remote tables, policies, views, functions, triggers, grants, and RPCs could not
be read. Consequently every remote object comparison is **UNKNOWN**. In
particular, RC2 cannot claim whether production protects public home/detail,
Search v1/counts, related/dealer reads, saved-search matching, draft creation,
listing updates, submit/resubmit, or staff boundaries. Controlled runtime smoke
remains required after schema parity is proven.

## Security and Auth/provider state

The current Security Advisor could not be read in RC2. RC1 observed a hibernation
response; RC2 did not use a request that might wake or mutate project state.
No current Advisor finding is classified as benign or exploitable without its
definition and grants.

Production Auth configuration is also not exposed through the available
read-only tools. Therefore:

| Item | Status |
| --- | --- |
| PHONE_AUTH | UNKNOWN |
| PASSWORD_LOGIN | UNKNOWN |
| SMS_PROVIDER | UNKNOWN |
| SITE_URL | UNKNOWN |
| REDIRECT_URLS | UNKNOWN |
| KZ_PLUS7_COMPATIBILITY | UNKNOWN |
| real +7 smoke | UNKNOWN |

## RC2 matrix

| Gate | Status |
| --- | --- |
| JLC-0523 | GREEN |
| local regression/build | GREEN |
| migration parity | UNKNOWN |
| legal acceptance migration | UNKNOWN |
| JLC-0521 production schema | UNKNOWN |
| JLC-0521 runtime smoke | NEEDS_CONTROLLED_SMOKE |
| JLC-0522 production schema | UNKNOWN |
| JLC-0522 runtime smoke | NEEDS_CONTROLLED_SMOKE |
| production security | UNKNOWN |
| auth/provider configuration | UNKNOWN |
| real +7 SMS smoke | UNKNOWN |
| Preview readiness | READY_TO_EXECUTE |
| production deployment while paused | BLOCKED |
| domain/DNS | NEEDS_OWNER_ACTION |
| Supabase callbacks | NEEDS_OWNER_ACTION |
| legal operator facts | NEEDS_OWNER_ACTION |
| final production smoke | BLOCKED |
| GO-LIVE | BLOCKED |

## Exact RC3 sequence

1. Restore a read-only authenticated Supabase management/database session for
   the already verified ref `dmjifqbvbjewyigdsuco`; no credential should be
   printed or persisted in the repository.
2. Read and archive the complete remote migration list, then compare its ordered
   versions and names to all 181 local migrations. Classify content-equivalent
   timestamp differences before calling anything local-only.
3. Read-only inspect the legal-acceptance table/policies/grants; JLC-0521
   views/functions/policies; JLC-0522 trigger/function/RPC dependencies; and
   the current Security Advisor findings.
4. Read production Auth configuration and provider state without sending OTP or
   exposing credentials.
5. If and only if the ordered diff proves specific migrations absent, prepare a
   separate, explicitly authorized RC3 application runbook in that exact order.
   Otherwise skip migration application and proceed to approved controlled
   production isolation smoke.

No migration is `READY_TO_APPLY` from RC2 evidence.
