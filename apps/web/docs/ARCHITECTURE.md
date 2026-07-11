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

## Backend

Backend is Supabase:

- Postgres for domain data.
- Supabase Auth for phone-first login.
- Supabase Storage for listing media.
- RLS on user-owned and admin-private tables.
- SQL migrations in `supabase/migrations`.

No custom server is present in `apps/web`.

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
