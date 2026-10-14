# JLC-1404 frontend bundle, render, and caching hardening

**Captured:** 2026-10-14, local-only

## Evidence and result

`npm run test:jlc-1404` runs an optimized local production build using local Supabase runtime values, parses the route table, and fails when any critical route exceeds the 300 kB First Load JS budget. The measured route results were:

| Route | First Load JS | Result |
| --- | ---: | --- |
| `/` | 218 kB | Pass |
| `/search` | 223 kB | Pass |
| `/listing/[id]` | 218 kB | Pass |
| `/dealer/[id]` | 208 kB | Pass |
| `/sell` | 289 kB | Pass |
| `/profile/dealer-crm` | 209 kB | Pass |

The task also verifies that the optional assistant panel remains a client-only dynamic import and is not mounted while closed. Its component source is 6.2 kB; deferring its mount prevents an unnecessary post-hydration optional-panel render/load on every eligible route. The panel still loads after an explicit user action and retains keyboard/focus behavior.

## Cache and rendering boundary

The public homepage, search, and listing-detail routes intentionally remain `force-dynamic` with `revalidate = 0`. They read request-scoped locale data and fresh marketplace data, so adding a shared cache would risk stale listing/search content or an unsafe request-context mix. The JLC-1404 gate asserts that this boundary remains intact.

## Limitations

The budget is an optimized-build guardrail, not production CDN or browser Core Web Vitals evidence. The local database currently lacks populated public listing/dealer fixtures and authenticated seller sessions; `test:jlc-1401` covers local server-response boundaries but not full browser Vitals for those flows.
