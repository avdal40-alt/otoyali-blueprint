# OTOYALI Web MVP

OTOYALI Web is the code-first production MVP for `otoyali.com`.

FlutterFlow remains a UI prototype/reference. This app is the real web product: a mobile-first Next.js experience for browsing listings, searching vehicles, viewing details, publishing listings, phone authentication, profiles, favorites, and automotive news.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase JS client
- React Server Components for public reads
- Client components for auth, filters, favorites, profile, and publishing
- Vercel-ready structure
- PWA-ready manifest and icon placeholder

## Environment Variables

Create `apps/web/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Do not commit real secrets.

## Install

```bash
cd apps/web
npm install
```

## Local Development

```bash
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run lint
npm run typecheck
npm run build
npm run start
```

## Vercel Deployment

1. Create a Vercel project from this repository.
2. Set root directory to `apps/web`.
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

## Supabase Dependency

Public browsing uses existing public views:

- `public.ff_home_listings`
- `public.ff_listing_details`
- `public.ff_listing_media`
- `public.ff_makes`
- `public.ff_models`
- `public.profiles`

Authenticated mutations use existing domain tables:

- `vehicle.vehicle_profiles`
- `vehicle.profile_ownership`
- `vehicle.profile_media`
- `marketplace.listings`

WEB-01 adds one minimal migration for:

- `marketplace.listing_favorites`
- `vehicle-photos` Supabase Storage bucket and policies

## Phone OTP Note

Authentication is phone-only through Supabase Auth OTP.

No email login. No password login.

For local testing, make sure Supabase phone auth is configured. If an SMS provider is not configured, use the local Supabase test OTP setup from `supabase/config.toml`.

## Android Future Path

The web MVP is mobile-first and PWA-ready so the same codebase can power Android later.

Option 1: wrap the stable web app with Capacitor.

Option 2: use Trusted Web Activity / Bubblewrap after Vercel deployment.

Do not build a separate Android app until the web MVP proves the product flow.

## Known Sprint 1 Limitations

- News is static local content in `src/data/news.ts`.
- Contact seller is auth-gated but shows a Sprint 1 placeholder.
- Similar listings are a placeholder.
- Favorites require the WEB-01 migration to be applied.
- Photo upload requires the `vehicle-photos` bucket migration to be applied.
- Search filters are client-side for Sprint 1 scale.
- No AI assistant.
- No VIN reports.
- No payments.
- No chat.
- No dealer dashboard.
- No CMS.
