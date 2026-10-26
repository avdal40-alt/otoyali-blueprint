# RC1 production preflight — 2026-10-26

This is an inspection-only record. No production migration, SQL write, Auth
change, environment change, deployment, promotion, domain/DNS change, user,
listing, or SMS action was performed.

## Local release candidate

- Branch / HEAD: `jolcar/autonomous` / `7e5924abdb23131c1662555bfbe15c5c17a550a0`.
- Worktree: clean when inspected.
- JLC-0523: `complete` in `TASK_QUEUE.json`.
- Active Jolmod profile: Kazakhstan, KZT, `ru`, `kk`, `en`, `zh-CN`; Russian is
  the default and fallback. Turkish is not a Jolmod launch locale.
- Fresh current-HEAD gates passed: `test:jlc-1508`, `test:country-config`,
  `test:jlc-0107`, `test:jlc-0521`, `test:jlc-0522`,
  `test:security-final-media-reference`, `test:i18n-foundation`,
  `test:i18n-routing`, `typecheck`, and `lint`. Lint retains its known
  non-blocking `SafeImage.tsx` `no-img-element` warning.

## Canonical remote identities

- Supabase production: `dmjifqbvbjewyigdsuco`, **avdal40-alt's Project**,
  `ap-south-1`, `ACTIVE_HEALTHY`. `uivazzvxelptjmbbfvir` was not used.
- Vercel production: `jolcar` / `prj_EwAVssfFrOkhzQV4tHz0qS9g3ZlK`.
  It is paused (`live: false`). The production alias is
  `https://jolcar.vercel.app` and no custom domain was verified.
- Vercel staging: `jolcar-staging` / `prj_pprF8wVDXI77cPz6H1Lox0nYsMyi`, also
  paused; its verified alias is `https://jolcar-staging.vercel.app`.

## Migration inventory and legal acceptance

The repository contains **181** ordered migration files. The JLC-0520 anchor
is `20261021173638_jlc_0520_admin_helper_self_scope.sql`; later local files:

1. `20261021182338_jlc_0521_kazakhstan_public_read_isolation.sql`
2. `20261022064213_jlc_0522_kazakhstan_seller_write_isolation.sql`
3. `20261022065255_jlc_0523_video_analytics_locale_contract.sql`
4. `20261025120000_jlc_0523_legal_acceptance.sql`
5. `20261026001543_jlc_0523_harden_legal_acceptance_grants.sql`
6. `20261026103000_jlc_0110_dealer_import_kz_city_binding.sql`
7. `20261026104000_jlc_0110_dealer_import_column_binding.sql`
8. `20261026105000_jlc_0110_dealer_import_archive_lifecycle.sql`

The canonical-project migration history could not be read: both the migration
history endpoint and an explicitly read-only metadata query failed with the
connector's PostgreSQL authentication error. Therefore the remote migration
count, exact parity, remote-only entries, and the status of every candidate
above are **unknown**. They are not asserted absent or safe to reapply.

The legal-acceptance migrations are additive locally: they create
`public.legal_document_acceptances` with `(user_id, document_key,
document_version)` identity and `accepted_at`; enable RLS; permit authenticated
users to select/insert only their own rows; deny anonymous access; make
application-role history append-only; and retain intentional service-role
access. They do not transform existing user data. Remote application status is
unknown pending history and schema inspection.

## Isolation and security preflight

Local JLC-0521 defines a trusted KZ-city predicate, KZ-only public search
policy/view predicates, and a fail-closed saved-search matcher. Local JLC-0522
defines a trigger requiring a KZ city and KZT whenever listing city/currency is
created or changed, preserving untouched historical TR rows. Local tests pass.

Current production table definitions, policies, views, functions, grants, and
Security Advisor findings could not be read. The advisor endpoint reported the
project hibernated; migration/schema reads failed authentication. Consequently
production JLC-0521/JLC-0522/security classification is **unknown**, not
verified by local source alone. Future controlled runtime proof must use
pre-existing approved actors/data and demonstrate KZ reads cannot expose or
address TR data; dealer/related/facet/saved-search reads remain KZ-only; and a
KZ seller cannot spoof TR during draft/edit/submit/resubmit.

## Auth, SMS, configuration, and deployment state

- Production Vercel has configured `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`; no hidden production Vercel variables were
  reported. No production Vercel SMS, AI, app/base URL, or feature-flag
  variable name was present in this inventory. This does not prove the absence
  of provider configuration outside Vercel.
- Staging has Supabase public/server variable names and AI configuration names
  configured. Its latest deployment is `READY`, but its accessible deployment
  metadata did not prove it contains the current RC1 commit.
- Production's latest deployment is `BLOCKED` at
  `dpl_A3SwAn5SdS7r33TmxxazpbBvqHmb`, branch `jolcar/autonomous`, commit
  `c3049fcceec3330e65db4adfe1920e82762bea2f`; it is not current HEAD. The last
  observed `READY` production candidate was
  `dpl_J5uw3r9Pjp7wVc6bMMirfcuVldZh` at `902072b3edafde190ceb7fcce58486a7626a3ec3`.
- Auth provider settings, Site URL, redirect URLs, password/phone configuration,
  and SMS provider readiness were not readable with the available inspection
  interface. No SMS was sent. Real +7 smoke is not ready to authorize from this
  evidence.
- The local market profile uses the temporary `jolcar.vercel.app` host for
  canonical/sitemap metadata. A final custom domain, corresponding Supabase
  Site URL/redirect URLs, and legal operator facts remain owner decisions.

## RC1 matrix

| Gate | Status | Evidence / release condition |
| --- | --- | --- |
| 1 — JLC-0523 / registry | GREEN | Local registry and completion evidence verified. |
| 2 — local regression/build | GREEN | Current-HEAD critical gates and JLC-1508 passed. |
| 3 — migration parity | UNKNOWN | Canonical remote history unreadable. |
| 4 — legal acceptance migration | UNKNOWN | Local migration is ready; remote state unreadable. |
| 5 — JLC-0521 schema | UNKNOWN | Remote definitions unreadable. |
| 6 — JLC-0521 runtime smoke | NEEDS_CONTROLLED_SMOKE | Requires approved read-only/controlled production test plan after parity. |
| 7 — JLC-0522 schema | UNKNOWN | Remote definitions unreadable. |
| 8 — JLC-0522 runtime smoke | NEEDS_CONTROLLED_SMOKE | Requires authorized controlled seller-flow smoke. |
| 9 — security | UNKNOWN | Current Security Advisor/ACL inspection unavailable. |
| 10 — auth/provider config | UNKNOWN | Production Auth settings unreadable. |
| 11 — real +7 SMS smoke | NEEDS_CREDENTIALS | No verified SMS provider/configuration. |
| 12 — Preview environment | READY_TO_EXECUTE | Project/deployment available; RC1 commit identity not proven. |
| 13 — Preview smoke | BLOCKED | Requires RC1 deployment identity and non-destructive access method. |
| 14 — paused production deployment | BLOCKED | Current deployment is blocked and predates RC1. |
| 15 — custom domain/DNS | NEEDS_OWNER_ACTION | Final domain is undecided. |
| 16 — Supabase auth callbacks | NEEDS_OWNER_ACTION | Depends on final host and unreadable Auth settings. |
| 17 — legal operator facts | NEEDS_OWNER_ACTION | Entity/BIN/address/support/legal contact are unapproved. |
| 18 — final production smoke | BLOCKED | Depends on gates 3–17 and explicit authorization. |
| 19 — GO-LIVE / unpause | BLOCKED | Production remains intentionally paused. |

## Exact next sequence

1. Restore or provide read-only canonical Supabase migration/schema/Advisor
   access; compare all 181 local versions against remote before proposing any
   migration. Risk: none to data; verification: exported ordered diff.
2. If parity proves a candidate absent, prepare a separately authorized,
   additive migration application plan with rollback/recovery and local proof;
   do not apply in preflight.
3. Verify production Auth/SMS configuration without revealing secrets, then
   obtain owner approval for one minimal Kazakhstan +7 registration/recovery
   smoke. Risk: paid SMS/account state; recovery: test-account cleanup policy.
4. Deploy the reviewed RC1 commit to staging only with authorization, inspect
   its build/environment identity, and run non-destructive Preview smoke.
5. Obtain final domain and legal-operator facts; configure Vercel/Supabase
   callbacks/canonical metadata only through separately authorized changes.
6. After all prerequisites are green, create a controlled production rollout
   plan, deploy while paused, perform approved production smoke, and request a
   distinct GO-LIVE/unpause authorization.
