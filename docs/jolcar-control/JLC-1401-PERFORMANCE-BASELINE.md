# JLC-1401 local critical-flow performance baseline

**Captured:** 2026-10-14 locally only

**Scope:** homepage, search, listing detail, sell, dealer profile, and dealer CRM entry

**Decision:** D-049 — establish a baseline before making measured hardening changes.

## Repeatable local method

1. Start the repository's existing local Supabase stack; do not use a remote project.
2. Run `npm run test:jlc-1401` in `apps/web`. The harness builds the app with local runtime values only (without printing them), discovers local active-listing and dealer fixtures, starts the built application on an unused loopback port, records cold and warm response timing, and stops its child process.
3. Keep the same local machine state for comparisons. Record cold responses separately: process start, file-system cache, database cache, and local Docker contention make them unsuitable as release budgets.
4. For browser Web Vitals, use a fresh Chromium profile and an incognito/authenticated synthetic local account as appropriate. Record the 75th percentile of three warm navigations per route in Chrome DevTools Performance or an equivalent local browser trace; never upload traces containing local account data.

The automated harness is a server-response baseline, not an emulation of a Kazakhstan production network or CDN. `/sell` and `/profile/dealer-crm` are measured at their unauthenticated entry boundary; the browser procedure above is required for their authenticated rendering baseline.

If the local database has no active listing or dealer fixture, the harness records the bounded not-found route timing and emits an explicit `fixtureLimitations` entry. That is a local-data limitation, not evidence that the populated public detail/profile flow meets a budget; a populated synthetic local fixture is required before treating either route as a full-flow regression result.

## Budgets

| Metric | Local gate | Why it is safe to enforce locally |
| --- | ---: | --- |
| Public route warm response (`/`, `/search`, listing detail, dealer) | <= 3,000 ms | Detects accidental blocking server work without pretending Docker is a production host. |
| Authenticated-entry warm response (`/sell`, dealer CRM) | <= 1,000 ms | Detects an unexpectedly slow auth/redirect boundary. |
| LCP p75 | <= 2.5 s | Healthy Core Web Vitals target, captured through the browser procedure. |
| INP p75 | <= 200 ms | Healthy Core Web Vitals target, captured after a representative filter/form interaction. |
| CLS p75 | <= 0.10 | Healthy Core Web Vitals target, captured through the browser procedure. |
| First Load JS | <= 300 kB per critical route | Build output guardrail; it is not a substitute for browser Vitals. |

The response budgets are intentionally local-only gates. Core Web Vitals are browser/user-experience targets: a local pass cannot establish a production field-data claim. Any production or provider measurement remains separately authorized.

## Baseline result

The `test:jlc-1401` command is the authoritative repeatable result. Its JSON output records each route's cold and warm response time, HTTP status, and the enforced budgets. The completion evidence in `TASK_QUEUE.json` records the captured command result and its limitations; do not replace it with a remote measurement in autonomous mode.

| Route | Cold response | Warm response | Result |
| --- | ---: | ---: | --- |
| `/` | 59 ms | 54 ms | Pass |
| `/search` | 77 ms | 46 ms | Pass |
| `/listing/not-a-local-listing` | 42 ms | 33 ms | Route boundary only; no active local fixture. |
| `/sell` | 66 ms | 30 ms | Pass; unauthenticated entry boundary. |
| `/dealer/not-a-local-dealer` | 30 ms | 21 ms | Route boundary only; no local dealer fixture. |
| `/profile/dealer-crm` | 14 ms | 11 ms | Pass; unauthenticated entry boundary. |

Browser LCP/INP/CLS are targets and an explicit repeatable local capture procedure, not measured field metrics. This local database has no synthetic listing/dealer fixtures or authenticated seller session, so it cannot produce a meaningful populated-detail or authenticated-flow Vital trace yet. That limitation is recorded rather than hidden; the server-response baseline remains repeatable and enforced.

## Interpretation and escalation

- A warm response above a local budget is a release-blocking regression until measured, fixed, and re-measured.
- A cold-only outlier caused by process startup, Docker resource contention, or local caches is not a product latency result; retain it as diagnostic context and compare warm values.
- A browser Vital over its target requires a reproducible local trace and measured remediation; do not disable accessibility, RLS, SEO, freshness, or privacy controls to improve it.
- Changes following this baseline use **baseline -> narrow change -> re-measure**. JLC-1402 through JLC-1407 own later database, media, bundle/cache, architecture, search-boundary, and regression work.
