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

## Frontend

The Next.js app lives in `apps/web`.

Page groups:

- Public pages: `/`, `/search`, `/listing/[id]`, `/video`, news, legal/trust, and future vertical placeholders.
- Protected user pages: `/sell`, `/profile`, `/my-listings`, `/favorites`, `/settings`.
- Auth pages: `/login`, `/otp`, `/auth/callback`.
- Admin pages: `/admin`, `/admin/listings`, `/admin/videos`, `/admin/reports`, `/admin/users`, `/admin/settings`.
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
- Commercial vehicles, marine vehicles, spare parts, services, and insurance are truthful coming-soon landing pages.
- `src/lib/marketplace/verticals.ts` is the central registry for IDs, routes, labels, capabilities, statuses, SEO inclusion, and supported seller/media types.
- `src/lib/marketplace/attributes.ts` prepares typed attribute configs for future vertical stages.
- `src/lib/marketplace/types.ts` defines shared cross-vertical listing/search/media/seller contracts.

No WEB-12 migration was created. Current `marketplace.listings` still requires `vehicle_profile_id`, so non-car persistence needs a future additive data-model task before real non-car listings can exist.

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

No custom server is present in `apps/web`.

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
- Public compatibility views: `public.ff_*`

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
