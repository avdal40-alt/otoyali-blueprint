# Search publication-path contract

**Parent:** FUNCTIONAL-02C1. **Evidence:** current migrations and public `ff_*` views.

## Current eligibility

The current public views require `marketplace.listings.status = 'active'`, `moderation_status = 'active'`, an active vehicle profile, and active make/model. Future Search must use this predicate; it must not make a non-public listing searchable.

## Paths

| Path | Evidence | Result | Future action |
| --- | --- | --- | --- |
| Admin moderation approval | `20260721140000_security01_listing_lifecycle_hardening.sql` | active/active | PUBLISH_FULL |
| Owner pause | same lifecycle migration | non-public | INVALIDATE |
| Owner sold | same lifecycle migration | non-public | INVALIDATE |
| Owner archive | same lifecycle migration | non-public | INVALIDATE |
| Rejected edit/resubmit | `20260724120000_sell03_rejected_listing_editing.sql` | pending review | NO_REFRESH |
| Direct profile/media/trust edits | vehicle/profile-media RLS paths | source may change | KEEP_OLD_APPROVED_SNAPSHOT |

## Mutation classification

- `REQUIRES_REMODERATION`: rejected-listing edit/resubmit and trust/profile changes.
- `NOT_CURRENTLY_SUPPORTED`: active seller title/description and location publication refresh.
- `IMPLEMENTATION_GAP`: approved-entry refresh, exit invalidation, backfill, and video projection refresh.
- `AMBIGUOUS_PRODUCT_POLICY`: none identified.

## Privacy inventory

Never project `public.profiles` phone/account data, `vehicle.private_vins` raw/normalized VIN, fingerprint or IDs, private evidence metadata, seller notes, moderation/rejection notes, or AI/report internals.

## Sub-stage boundary

02C1B adds only the table and inaccessible internal full-refresh function. 02C1C wires documented approval paths and defensive exits. 02C1D backfills eligible rows and proves anon/auth privacy and mutation boundaries.
