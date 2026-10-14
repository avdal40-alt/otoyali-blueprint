# JLC-1403 — Local media and image delivery hardening

**Date:** 2026-10-14
**Scope:** local Next.js application and local Supabase only. No production,
provider, storage-policy, migration, or CDN configuration change was made.

## Payload and derivative audit

The local database physical view definitions confirm that public list/search
cards select `card_url`, then `large_url`, then legacy `url`; listing detail
selects `large_url`, then `original_url`, then legacy `url`. This preserves the
existing public `card_url` / `large_url` / `url` contract and keeps card paths
off the original derivative when a card derivative exists.

The sanitized server pipeline remains the authoritative derivative producer:

| Context | Derivative ceiling | Browser selection |
| --- | ---: | --- |
| Gallery/admin rail | 300px thumbnail | `thumb_url` |
| Listing cards | 800px card | `thumb_url`, `card_url`, `large_url`, `original_url` responsive candidates |
| Listing detail | 1600px large | `card_url`, `large_url`, `original_url` responsive candidates |
| Full source fallback | 2400px master/original | only where the view/component asks for it |

`SafeImage` now emits a `srcset` only for rows with a persisted positive source
width. It advertises direct derivative URLs only—never a fallback URL under an
incorrect width descriptor—and supplies matching card/detail/thumbnail `sizes`.
The normal `src` keeps the existing fallback order for legacy rows. Non-priority
images remain lazy-loaded and async-decoded; layout containers retain fixed
aspect ratios, so the change does not weaken accessibility or introduce layout
shift.

WebP is the current safe sanitized output format. The responsive set does not
assume an extension, so approved future AVIF derivative URLs can be selected by
supporting browsers. Introducing AVIF production/storage output would require a
separate migration and RPC/storage-content-type review; it is intentionally out
of scope for this local task.

## Local verification

- `npm run test:jlc-1403` — responsive source-set, dimensions, fallback,
  lazy-loading, and card/detail/thumb contract checks.
- `npm run test:jlc-0507` — existing secure upload, sanitized derivative, RLS
  contract, and variant fallback regression.
- `npm run test:jlc-0202` — card 4:3 stable-grid/layout reservation regression.
- `npm run test:jlc-1204` — critical query and bounded public-path regression.
- `npm run typecheck` and `npm run test:jlc-1401` — production build and local
  critical-flow warm-response re-measurement. The warm responses stayed
  14–72ms, within the established 1000ms/3000ms local budgets.

The local database has zero `vehicle.profile_media` rows, so an actual network
payload capture or populated browser visual smoke cannot be represented as a
pass. The physical view audit and deterministic rendered-image contract are the
local evidence; a populated synthetic local fixture should be used for a later
browser byte-size trace. This limitation does not waive the derivative-selection
and accessibility contracts enforced above.
