# JLC-1501 — Architecture and domain-boundary audit

**Status:** completed locally
**Scope:** Accounts, Listings, Search, Dealers, CRM, Messaging, Reviews, Live,
AI, and Analytics in the current Next.js/Supabase application.

## Decision and constraints

This audit implements D-049. PostgreSQL is the current source of truth and
Next.js/TypeScript is the current application boundary. The result deliberately
does **not** introduce a microservice, NestJS, Redis, OpenSearch, Kafka,
Kubernetes, a second database, or a provider integration. No migration,
privilege, RLS, or production change is required.

The standalone-API target is an extraction seam, not a mandate to duplicate
the existing web application now: externally reachable operations have an
explicit HTTP request/response contract, while server-only domain services
keep database implementation details behind that edge.

## Boundary rules

1. Presentation components render typed route/server data or call a named
   JSON/RPC contract. They do not receive a service-role client, database
   credentials, or private-table DTOs.
2. Route handlers authenticate the actor, validate the input, map only the
   allowed public/private DTO, and preserve database/RLS authorization. A
   future standalone API extracts these handlers/contracts; it must not
   bypass their RPC, RLS, ownership, rate-limit, or privacy controls.
3. Server-only domain modules may use a Supabase client only through the
   narrow domain contract named below. Search is the reference boundary:
   callers use `SearchService`, while the PostgreSQL adapter owns Search v1.
4. Existing browser Supabase use is restricted to the established anonymous
   client transport for Auth/session, explicitly public projections, or
   database-owned RPCs. It is not authority: private mutations and
   authorization remain enforced by RLS/RPC/server handlers. New cross-domain
   flows must use one of the named contracts below instead of adding browser
   access to private implementation tables.
5. A contract must preserve its data guarantees when extracted: public
   listing/media privacy, Search v1 cursor/`raised_at`/`published_at` rules,
   `has_video` projection, lifecycle/moderation transitions, and owner/admin
   authorization. This audit creates no alternative write path.

## Domain ownership and public contracts

| Domain | Owner and current implementation | Contract consumed by UI/integration | Extraction boundary |
| --- | --- | --- | --- |
| Accounts | Supabase Auth plus `src/lib/auth/*`, password-enrollment and phone policy modules | Auth/session UI and protected server routes | Auth/session adapter; no caller receives service credentials |
| Listings | `src/lib/listings/server-write.ts`, listing/media/video route handlers, lifecycle RPCs | `/api/listings/*`, `/api/listing/contact`, protected/public projections | Listing command/query API retaining RPC/RLS lifecycle checks |
| Search | `src/lib/search/search-service.ts` PostgreSQL adapter | Typed `SearchService`/Search v1 request-response contract | Replace the adapter only after measured need; PostgreSQL stays authoritative |
| Dealers | Dealer domain routes and database-owned dealer RPCs | `/api/dealer/feed` and dealer import endpoints | Dealer integration API with bounded request payload and dealer token authorization |
| CRM | Dealer CRM pages and dealer-scoped database/RLS contracts | Existing authenticated dealer CRM UI projections | Dealer-scoped CRM API; preserve staff and dealer ownership checks |
| Messaging | `src/lib/messaging/conversation-api.ts` plus conversation route handlers | `/api/conversations` and nested message/block/read/report endpoints | Conversation API with authenticated actor, cursor, rate limit, and non-enumerating errors |
| Reviews | Review routes with Zod input validation and vehicle catalog checks | `/api/reviews` and review moderation routes | Review command/query API; author/moderator controls stay server/database enforced |
| Live | `src/features/dealer-live/transport.ts` and live domain routes | Provider-neutral `DealerLiveTransportAdapter` and live UI DTOs | Provider adapter can change without turning Supabase/Vercel into video transport |
| AI | `src/features/ai/domain`, `services`, `tools`, and `/api/ai/*` | Typed request/response, action allow-list, and minimal context | Secure AI runtime; no arbitrary DB, SQL, RPC, or private-contact access |
| Analytics | analytics route handlers and database-owned event/aggregation RPCs | Bounded `/api/analytics/*` event payloads and seller/dealer projections | Analytics ingestion/query API retaining actor, deduplication, and privacy controls |

## Current boundary findings

- Search already meets the desired service boundary. `SearchService` is used
  by web and AI flows; its PostgreSQL adapter remains the only Search v1
  implementation. Its cursor ordering and listing projections are not
  reimplemented in UI code.
- Messaging is the strongest HTTP extraction example: the route contract
  authenticates the bearer actor, validates requests, applies a bounded
  process-local abuse control, maps ownership errors to non-enumerating
  responses, and delegates authorization to RPC/RLS.
- Reviews, dealer feed import, listing media/video, buyer requests, saved
  searches, notifications, and analytics already have narrow route/RPC edges.
  They must remain their source of authorization; an API extraction cannot
  move that trust decision into UI code.
- AI and Live use explicit provider/domain adapters. The current Live adapter
  is local-only and does not call a streaming provider. AI tools are
  allow-listed and server-owned.
- Some legacy route-local client components still use the anonymous Supabase
  client for their own public projection, Auth/session, or database-owned RPC.
  These are constrained by RLS but are migration candidates when a domain is
  moved to a standalone/mobile API. Do not widen them to private tables or
  service credentials; new cross-domain work follows the named boundary from
  the start. This is a controlled transport seam, not an authorization
  exception.

## Safe future extraction path

1. Freeze the existing typed request/response DTO and error/privacy behavior
   with a route/contract test.
2. Move only the route handler's orchestration to a server-only application
   service; keep SQL/RPC/RLS as the authority.
3. Point the Next.js handler and a future standalone API adapter at that same
   service. Do not expose tables, schemas, service-role keys, or private DTOs.
4. Run existing domain, RLS/security, cursor, lifecycle, saved-search,
   price-drop, analytics, and media projection regressions before cutover.

This preserves a future standalone API without a premature service extraction.
