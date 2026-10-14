# JLC-1407 — Performance regression release gate

**Date:** 2026-10-14
**Scope:** local repository, local Supabase, and local Next.js build only.

## Enforced gate

`npm run test:jlc-1407` is the single local performance regression gate. It
runs the completed JLC-1401 through JLC-1406 checks plus the shared JLC-1204
performance sanity regression. A failure in any delegated check fails this
gate; no result may be recorded as passing while a critical regression remains.

| Guardrail | Enforced by |
| --- | --- |
| Critical-flow warm response budgets | `test:jlc-1401` |
| Bounded public reads and matching local index plan | `test:jlc-1402`, `test:jlc-1204` |
| Responsive derivative selection, lazy loading, and layout safety | `test:jlc-1403` |
| Critical-route First Load JS budget and dynamic/cache boundary | `test:jlc-1404` |
| Provider-neutral deferred-work boundary | `test:jlc-1405` |
| PostgreSQL Search v1 scaling boundary and shared adapter | `test:jlc-1406` |

The gate re-builds and re-measures the critical local response and bundle
budgets after the completed hardening changes. It preserves `card_url`,
`large_url`, and `url` image fallback behavior; `has_video`; `raised_at` and
`published_at` Search v1 semantics; lifecycle/RLS authorization; and the
country-neutral SearchService boundary.

## Local limits

Browser LCP, INP, and CLS remain documented targets rather than passing local
field metrics. The local database has no authenticated seller session and no
dealer fixture, so this task does not claim a populated authenticated/dealer
browser-Vitals result. That limitation does not waive the automated response,
bundle, query, media, and contract budgets above. Production/CDN/provider
measurement remains separately authorized and was not performed.
