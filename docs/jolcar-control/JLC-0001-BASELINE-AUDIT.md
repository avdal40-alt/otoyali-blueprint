# JLC-0001 — Repository baseline audit and Jolcar reuse map

**Audited:** 2026-10-11
**Branch / HEAD:** `jolcar/autonomous` / `afb7a157f263bb3710b673bdf45da6bcb7fd202f` (`fix(search): preserve projection semantics after raise-to-top`)
**Scope:** local repository and local Supabase only. No production system, deployment, provider, or remote migration was accessed.

## Evidence method

This report treats current source, committed migrations, a running local database, and passing local tests as evidence. The historical OTOYALI/YOLMOD documents are implementation reference only, per `DOCUMENTATION_RECONCILIATION.md`; they are not used as completion evidence.

## Working-tree and repository state

- The starting tree contained only untracked temporary runner reports and the active `CODEX_NEXT_READY_TASK.md`; there were no tracked or user project changes.
- The four completed-run reports were removed under the runner-artifact rule. The active task file remains untracked and is not part of this task.
- Recent evidence-bearing commits are `b432ea5` (local migration reconciliation and seller analytics ingestion), `78caf57` (raise-to-top), and `afb7a15` (search `has_video` projection repair).
- `supabase_db_Otoyali-blueprint` was healthy locally. `npx.cmd supabase migration list --local` reported aligned local migration history through `20261011100000_restore_search_video_projection`.

## Reuse map

| Area | Classification | Current evidence | Jolcar implication |
| --- | --- | --- | --- |
| Web platform | VERIFIED | `apps/web/package.json` is a Next.js 15 / TypeScript application; source has public browse, listing, auth, seller, messaging, notification, dealer, review, and AI domains. | Reuse the existing application architecture rather than creating a parallel product. |
| Supabase/Postgres security foundation | VERIFIED | Committed forward-only migrations and local history are aligned. Recent search/raise migrations explicitly revoke public function execution and use bounded `search_path`; search remains `SECURITY INVOKER`. | Preserve existing RPC grants, RLS, and `security_invoker` behavior in follow-up work. |
| Search/listing projection | VERIFIED | Local `jlc-0512-raise-to-top-contract`, `jlc-0512-raise-to-top-local` (8 checks), and the post-repair migration passed/are present. `raised_at` preserves `published_at`; `has_video` is restored in the projection. | Shared search changes require regression coverage for cover-image optimization, video state, cursor ordering, and published date. |
| Saved-search and notification foundation | VERIFIED | `functional-03b-d-unified-notifications.test.cjs` passed against the committed price-drop and notification contracts. | Reuse notification RPC/API boundaries; do not query notification tables directly from clients. |
| Country/brand configuration boundary | PARTIAL | `test:country-config` passed and `src/lib/market.ts` has separate Turkey and Kazakhstan profiles. However the active profile is `yolmodTurkey`, and Jolcar is `planned`; Kazakhstan seller contacts are disabled. | JLC-0101 and its dependents must activate/complete the approved Kazakhstan boundary without changing shared semantics. |
| Localization and routing | PARTIAL | `src/i18n/config.ts` releases only `tr` and `en`, defaults to `tr`, and maps Turkish routes. `kk` is absent and `ru` is unreleased despite DECISIONS O-001 approving `kk-KZ`, `ru-KZ`, and `en`. | Do not claim Jolcar locale readiness. JLC-0106 / localization tasks must resolve this using the controlling decisions. |
| Seller contacts / phone policy | PARTIAL | Password/verified-contact migrations and seller-contact tests exist, but active market configuration retains `+90`, Turkey-only seller contacts, and a Twilio Verify label. | Preserve authorization/privacy controls; apply O-005 (+7 and provider-neutral rollout) only in its designated tasks. |
| Vehicle catalog and locations | PARTIAL | Country-adapter migrations exist, but legacy Turkey city/catalog migrations remain and current active configuration is Turkey. | JLC-0104/JLC-0105 must validate Kazakhstan data and keep the adapter boundary. |
| Feature/release completion | MISSING for Jolcar task status | Of 125 queue items, 99 are pending; only JLC-0512 is completed. Existing inherited code and tests do not close Jolcar roadmap tasks without task-specific evidence. | Advance only dependency-ready queue tasks and update their evidence individually. |

## Turkey-specific hardcodes and multi-country risks

1. `src/lib/market.ts` deliberately keeps `yolmodTurkey` active, with `TRY`, `tr-TR`, `https://yolmod.com`, `+90`, Turkey-only seller contact policy, and a Twilio Verify identifier. It is an explicit temporary compatibility configuration, not a Jolcar launch configuration.
2. `src/i18n/config.ts` defaults to Turkish and exposes Turkish route translations; it only releases `tr` and `en`. This conflicts with the now-decided Jolcar launch locale set in O-001.
3. Turkey-specific implementation remains distributed across UI, API, AI, auth, and search code, and in committed migrations including `20260706120000_data01_turkey_cities_vehicle_catalog.sql`, `20260912153000_functional_02b1_core_turkey_vehicle_schema.sql`, and the earlier seller-phone migrations. The inventory found many application files containing Turkey-specific text or policy.
4. Root architecture, security, and database documents remain OTOYALI/Turkey reference and include revoked payments, Turkey legal terms, Turkey phone policy, and Turkish defaults. `DOCUMENTATION_RECONCILIATION.md` correctly prevents them from overriding the Jolcar control documents.
5. Source comments in `src/lib/market.ts` still say O-001/O-005 are open, but `DECISIONS.md` records both as decided. Those comments must not be treated as authority and should be corrected by the country/configuration task that changes the affected behavior.

## Focused verification run

Run from `apps/web`:

```text
npm run test:country-config                         PASS
node scripts/jlc-0512-raise-to-top-contract.test.cjs PASS
node scripts/jlc-0512-raise-to-top-local.test.cjs    PASS (8 checks)
node scripts/functional-03b-d-unified-notifications.test.cjs PASS
npx.cmd supabase migration list --local              PASS (aligned through 20261011100000)
```

No broad build or full suite was run because JLC-0001 is an evidence audit, not an application change. No migration was created, changed, or applied.

## Follow-up boundary

JLC-0002 is now the next dependency-ready P0 release-gate task. It should reconcile the legacy documentation against the control documents and this evidence without treating inherited source as proof of Jolcar launch readiness.
