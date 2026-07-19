# Architecture

## Product Shape

OTOYALI is not only a car marketplace. The MVP starts with marketplace browsing, search, listing detail, listing publishing, OTOYALI Video, legal/trust pages, and moderation foundations.

Architecture principles:

- Guest First: public browsing must work without login.
- Progressive Auth: ask for login only when the user takes an identity-dependent action.
- Lazy Profile: profile data is created/loaded only when needed.
- Return to Context: login flows preserve `next` so users return to what they were doing.
- Vehicle Digital Twin direction: `vehicle.vehicle_profiles` is the core vehicle profile that listings, media, ownership, and future AI/history features can attach to.
- Lightweight public previews: Home/Search/SEO use explicit columns and limited public views.
- Detail-only depth: full listing detail and gallery data are loaded on listing detail.
- No video files on Home/Search/SEO pages: video counts/badges are allowed, video bytes are not.
- One platform, multiple verticals: future marketplace categories use a central vertical registry instead of scattered route checks.
- AI-first without false claims: the current Rif assistant foundation is local deterministic guidance only, with no external AI provider and no verified valuation/history claims.

## Frontend

The Next.js app lives in `apps/web`.

Page groups:

- Public pages: `/`, `/search`, `/listing/[id]`, `/video`, `/servisler`, service provider pages, news, legal/trust, and future vertical placeholders.
- Protected user pages: `/sell`, `/profile`, `/my-listings`, `/favorites`, `/settings`.
- Auth pages: `/login`, `/otp`, `/auth/callback`.
- Admin pages: `/admin`, `/admin/listings`, `/admin/videos`, `/admin/services`, `/admin/reports`, `/admin/users`, `/admin/settings`.
- SEO pages: make, model, city, condition/fuel/body-style landing pages.

Shared code is under:

- `src/components`
- `src/lib`
- `src/data`
- `src/app/*/_components` for route-local client components.

## Internationalization

The web app uses a lightweight internal i18n layer instead of an external translation framework.

- Turkish is the default canonical locale and keeps unprefixed routes.
- English routes live under `/en`.
- Middleware resolves locale from route prefix, cookie, `Accept-Language`, then Turkish fallback.
- Middleware rewrites `/en/*` to existing internal routes so the app does not duplicate route trees.
- Dictionaries live in `src/i18n/dictionaries`.
- Link and redirect helpers live in `src/i18n/config.ts`.
- Locale-aware display formatting lives in `src/lib/format.ts`.

This is frontend-only. It does not change Supabase schema, RLS, stored listing data, or catalog values. Listing titles and descriptions remain user-generated and are not translated.

## Marketplace Verticals

Vertical architecture is documented in [VERTICAL_ARCHITECTURE.md](./VERTICAL_ARCHITECTURE.md).

Current implementation:

- Cars are the only active listing vertical.
- Commercial vehicles, marine vehicles, spare parts, and insurance are truthful coming-soon landing pages.
- Services have a dedicated SERVICE-01 foundation for category discovery, active provider pages, private provider applications, and admin review readiness.
- `src/lib/marketplace/verticals.ts` is the central registry for IDs, routes, labels, capabilities, statuses, SEO inclusion, and supported seller/media types.
- `src/lib/marketplace/attributes.ts` prepares typed attribute configs for future vertical stages.
- `src/lib/marketplace/types.ts` defines shared cross-vertical listing/search/media/seller contracts.

No WEB-12 migration was created. Current `marketplace.listings` still requires `vehicle_profile_id`, so non-car listings need a future additive data-model task before real non-car listings can exist. Service providers are intentionally not vehicle listings and use `service_marketplace`.

## Service Marketplace

SERVICE-01 is documented in [SERVICE_MARKETPLACE_ARCHITECTURE.md](./SERVICE_MARKETPLACE_ARCHITECTURE.md).

Current implementation:

- Schema: `service_marketplace`.
- Public routes: `/servisler`, `/en/services`, `/servisler/[slug]`, `/en/services/[slug]`.
- Provider application routes: `/servisler/basvuru`, `/en/services/apply`.
- Admin readiness route: `/admin/services`.
- Public Supabase projections expose only active providers, active branches, active offerings, and active standardized categories.
- Provider applications are private, phone-authenticated, and never self-activate public provider profiles.

SERVICE-01 does not implement bookings, appointment slots, prices, ratings, CRM, work orders, payments, or service history.

## Booking Foundation

BOOKING-01A is documented in [BOOKING_ARCHITECTURE.md](./BOOKING_ARCHITECTURE.md).

Current implementation:

- Schema: `booking`.
- Additive branch timezone field: `service_marketplace.branches.timezone`.
- Reuses SERVICE-01 providers, branches, offerings, provider ownership, and admin authorization.
- Adds bookable resources, offering-resource eligibility, offering booking configuration, recurring working hours, availability exceptions, bookings, resource reservations, and immutable booking timeline.
- Adds `booking.get_public_availability` as the only guest-safe booking projection.
- Adds `booking.create_booking` and `booking.transition_booking_status` as database-controlled primitives for future server flows.
- Guarantees database-level overlap prevention for active capacity-1 reservations.

BOOKING-01A does not expose customer booking pages, provider calendar UI, booking inboxes, rescheduling/cancellation UI, notifications, payments, work orders, service history, or Rif booking actions.

## AI Assistant Foundation

AI architecture is documented in [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md).

Current implementation:

- `src/features/ai` owns assistant domain types, intents, capabilities, context minimization, action allowlists, providers, service boundary, UI shell, and hooks.
- `POST /api/ai/assistant` is the server boundary.
- The active default provider is a deterministic local preview provider.
- A disabled provider returns graceful localized unavailable responses.
- No AI SDK, external model call, embedding store, conversation persistence, or Supabase migration exists.
- The assistant is mounted once from the root layout and hidden from admin/auth/debug/profile/favorites/internal pages.
- AI context uses the WEB-12 vertical type and keeps inactive verticals to general guidance only.
- Service pages add safe service context: category, provider slug, city, and district only.

The assistant must not invent missing listing facts, claim access to TRAMER/VIN databases, guarantee price fairness, guarantee seller trust, or expose private seller/admin data.

## Design System

The web app has one UI foundation for marketplace, video, admin, legal pages, and future transport verticals.

- Tokens live in `src/lib/design-system/tokens.ts`.
- Tailwind maps those tokens through `tailwind.config.ts`.
- Global CSS variables, focus states, reduced motion, and future dark mode variables live in `src/app/globals.css`.
- Shared primitives live in `src/components/ui`.
- Page width and section rhythm live in `src/components/layout/PageContainer.tsx`.

New UI should use the shared Button, Input, Card, Badge, Modal, Drawer, loading, and empty-state primitives before adding route-local styling. FOUNDATION-01 is UI-only and does not change product logic, Supabase, auth, RLS, migrations, or routes.

## Backend

Backend is Supabase:

- Postgres for domain data.
- Supabase Auth for phone-first login.
- Supabase Storage for listing media.
- RLS on user-owned and admin-private tables.
- SQL migrations in `supabase/migrations`.

The only current app-owned route handler is `POST /api/ai/assistant`, which is a JSON boundary for local deterministic assistant responses. It does not call external providers or write to Supabase.

## Seller Publishing Workflow

The seller journey stays guest-first and progressive:

- `/sell` is protected and uses `/login?next=/sell`.
- Profile data is requested lazily inside the sell journey.
- The publish wizard keeps non-file draft fields in local storage as best-effort recovery.
- Vehicle specs are stored in `vehicle.vehicle_profiles`.
- Ownership is stored in `vehicle.profile_ownership`.
- Photos are stored in Supabase Storage and referenced by `vehicle.profile_media`.
- Listings are stored in `marketplace.listings`.
- Final seller submission creates a draft listing with `moderation_status = pending_review`.
- Admin approval changes listings to public by setting `status = active` and `moderation_status = active`.

Public browsing and public media visibility must require both active listing status and active moderation status. Owners can read their own listing/media rows through RLS for seller management.

## Image Media Pipeline

MEDIA-01 keeps image processing lightweight and browser-side:

- `/sell` generates source-safe `original`, `large`, `card`, and `thumb` image variants before upload.
- New paths use `listing-media/{userId}/{vehicleProfileId}/{mediaId}/{variant}/...`.
- `vehicle.profile_media.url` remains the legacy fallback.
- Public card views prefer `card_url`; listing detail/gallery prefers `large_url`; thumbnails/admin prefer `thumb_url`.
- Future server workers can backfill legacy media and perform plate blur/moderation, but no worker exists in the web app today.

## Product Domains

- Marketplace listings: `marketplace.listings`
- Vehicle profiles: `vehicle.vehicle_profiles`
- Makes/models/catalog: `vehicle.makes`, `vehicle.models`
- Ownership: `vehicle.profile_ownership`
- Media: `vehicle.profile_media`
- Videos: `marketplace.listing_videos`
- Favorites: `marketplace.listing_favorites`
- Saved searches: `marketplace.saved_searches`
- Cities: `marketplace.cities`
- Reports: `marketplace.reports`
- Admin users/audit: `public.admin_users`, `public.admin_audit_logs`
- Services: `service_marketplace.providers`, `service_marketplace.branches`, `service_marketplace.categories`, `service_marketplace.offerings`, `service_marketplace.provider_applications`
- Booking: `booking.bookable_resources`, `booking.offering_resources`, `booking.offering_booking_configurations`, `booking.recurring_working_hours`, `booking.availability_exceptions`, `booking.bookings`, `booking.resource_reservations`, `booking.booking_timeline`
- Public compatibility views: `public.ff_*`
- Service public views: `public.service_public_*`

## Runtime Diagram

```text
User
  -> Next.js app on Vercel
    -> Supabase Auth
    -> Supabase Postgres
    -> Supabase Storage
```

## Current Assumptions

- Vercel deploys from GitHub `main` when GitHub access is healthy.
- Production is currently `https://otoyali.vercel.app`.
- The official domain setup is paused until brand/domain direction is final.
