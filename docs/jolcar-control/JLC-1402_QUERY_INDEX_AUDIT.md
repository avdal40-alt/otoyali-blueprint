# JLC-1402 — Local query and index audit

**Date:** 2026-10-14
**Scope:** local Docker/Supabase only; no remote or production access.

## Critical-path inventory

| Path | Bound / query shape | Evidence and disposition |
| --- | --- | --- |
| Search v1 newest/raised cards | RPC validates `1..60`; web sends 24; keyset cursor orders by `COALESCE(raised_at, published_at)` then `listing_id`. | Existing expression index `marketplace.listing_search_documents_freshness_keyset_idx` exactly matches this order. Local forced-plan regression confirms an index scan with no extra sort. `raised_at`, true `published_at`, cursor semantics, video projection, and card URLs are unchanged. |
| Listing detail | Six independent reads begin in one `Promise.all`: details, media, fallback card, 12 recommendations, 3 videos, and review target. | No sequential per-card fetch is introduced. The primary and fallback gallery reads now both cap at 20—the same maximum exposed by the sell flow—preventing oversized data from bypassing the UI limit. |
| Listing media ordering | Gallery reads filter one listing or vehicle profile and order cover then `sort_order`. | Existing `vehicle.profile_media_cover_order_idx` covers the profile/cover/order shape. The public facade still returns all required `url`, `large_url`, and `card_url` fields. |
| Reviews | Approved-review reads use a 20-item page plus one sentinel row. | Server range is bounded; no N+1 client loop is present. |

## Local database evidence

Safe local `EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY ON)` was executed for the newest Search v1 order, listing media order, and owner listing order. The local database contains zero listings, search documents, and profile-media rows, so those `ANALYZE` timings are empty-fixture evidence only and must not be treated as capacity measurements.

Physical verification confirmed both critical indexes exist locally. The automated regression check disables sequential scans for the precise bounded newest-page query and verifies `listing_search_documents_freshness_keyset_idx` is used without a `Sort` node. No new index is justified without representative local fixture data; adding one would be speculative and impose write/storage cost without measured benefit.

## Regression evidence

- `npm run test:jlc-1402`
- `npm run test:jlc-1204`
- `npm run test:jlc-0404`
- `node scripts/jlc-0512-search-projection-regression.test.cjs`

The local-only audit adds no migration. A future capacity benchmark must seed representative local data inside a transaction or use an approved non-production fixture before asserting production-like timing or selectivity.
