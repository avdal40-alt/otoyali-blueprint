# JLC-1502 — Mobile API readiness

**Status:** completed locally
**Scope:** client-neutral contract audit for future mobile clients. This does
not introduce a native application, a standalone API, a provider, or a second
authorization path.

## Boundary

Jolcar's current Next.js JSON routes and typed server contracts are the mobile
reuse seam. A future React Native/Expo client may call the same HTTPS routes or
use the same typed contract where it is server-side; it must not depend on web
pages, WebView behavior, browser storage, private tables, service credentials,
or UI-only permission checks.

Authentication is client-neutral Supabase Auth/session transport. Protected
Jolcar routes receive `Authorization: Bearer <access-token>`, derive the actor
server-side, and use the anonymous request client only to preserve that actor's
RLS/RPC context. The routine Jolcar policy remains phone-plus-password login;
registration, recovery, and verified-contact changes retain their existing OTP
boundaries. A mobile client does not receive a service-role credential.

## Critical-flow contract matrix

| Flow | Reusable contract | Authentication and authorization | Pagination/media guarantee |
| --- | --- | --- | --- |
| Public search | `SearchService` with `SearchV1Request` / `SearchV1Response`, backed by `search_listings_v1` | Public projection only; PostgreSQL remains authoritative | `version: "v1"` cursor is returned verbatim. Cursor ordering, `raised_at` ranking, `published_at`, and `has_video` remain canonical rather than being recreated by a client. |
| Listing commands | `/api/listings` and `/api/listings/[id]/*` JSON routes | Bearer actor is derived server-side; lifecycle RPCs and ownership/RLS remain authority | Listing/media DTOs expose only their defined public or owner-safe fields. |
| Secure photo/media work | `/api/listings/[id]/media`, media item, cover, video, and cleanup routes | Bearer actor plus owner/draft checks and listing RPCs; trusted storage stays server-only | Upload/finalize uses sanitized `master`, `large`, `card`, and `thumb` derivatives. A client never selects storage paths outside the validated owner path or bypasses cleanup/ownership rules. |
| Messaging and notifications | `/api/conversations/*` and `/api/notifications/*` JSON routes | Bearer actor, RLS/RPC ownership, rate limits, private no-store responses, and non-enumerating conversation errors | Cursor pairs are explicit (`beforeAt`, `beforeId`) with bounded limits; notifications return `nextCursor`. |
| Saved searches and buyer requests | `/api/saved-searches/*` and `/api/buyer-requests/*` JSON routes | Bearer actor and database-owned own-resource RPCs | Stable JSON DTOs preserve typed search request criteria and owner-only state. |
| Protected seller contact | `/api/listing/contact` JSON route | Bearer actor, disclosure reservation/rate boundary, and `get_listing_seller_contact` RPC | The selected verified phone is returned only after database authorization; public browse/search/detail never expose it. |
| Dealer feed integration | `/api/dealer/feed` JSON route | Dealer API token is validated by the database-owned import RPC, not by a mobile client | Bounded JSON array and normalized per-row result DTO keep import semantics independent of web UI. |

## Error and transport contract

All listed routes use JSON bodies/results and HTTP status codes, so a client
does not need Next.js navigation semantics. For protected routes, `401` means
no valid bearer actor; `422` means a malformed or invalid request; `429` is a
rate limit where applicable; `403`/`404` retain the route's privacy semantics;
and `5xx` is a non-authoritative server/provider failure. Private responses
remain `Cache-Control: private, no-store, max-age=0` and vary by
`Authorization`.

Consumers must treat server/database authorization as final even if local UI
has already hidden an action. They must retain structured error handling and
the existing cursor values without client-side reordering. Any future extracted
or standalone API must first preserve these contracts and rerun the existing
RLS, lifecycle, media, Search v1, saved-search/price-drop, analytics, and
messaging regressions named by JLC-1501.

## Deliberate non-goals

- No React Native, Expo, iOS, Android, WebView, or mobile-specific UI is added.
- No public/private table exposure, service-role credential, RLS change, or
  authorization weakening is added.
- No provider, production resource, migration, or remote deployment is used.
