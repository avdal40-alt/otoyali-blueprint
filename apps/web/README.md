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

## Troubleshooting

### Environment missing

If pages show empty data and the development debug panel says environment variables are missing, create `apps/web/.env.local` with:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Restart `npm run dev` after changing env values.

### Invalid API key

Supabase accepts both legacy anon JWT keys beginning with `eyJ...` and publishable keys beginning with `sb_publishable_...`.

Do not paste service role keys into the web app.

### Supabase rows exist but UI is empty

Open the development-only route:

```text
/debug/supabase
```

It shows:

- env presence
- Supabase URL domain only
- key type without exposing the key
- row counts for `ff_makes`, `ff_home_listings`, `ff_listing_details`, and `ff_listing_media`
- first 3 safe `ff_home_listings` rows

This route returns 404 in production.

### SQL checks

In Supabase SQL editor, confirm:

```sql
select count(*) from vehicle.makes;
select count(*) from vehicle.models;
select count(*) from marketplace.listings;
select count(*) from public.ff_home_listings;
select count(*) from public.ff_makes;
```

Expected demo seed baseline:

- `vehicle.makes = 8`
- `vehicle.models = 16`
- `marketplace.listings = 6`
- `public.ff_home_listings = 6`

### Seed data

Local/demo data comes from `supabase/seed.sql`. If public views return zero rows, apply migrations and seed data, then reload PostgREST schema:

```sql
notify pgrst, 'reload schema';
```

### Grants

Public views must be readable by guest users:

```sql
grant usage on schema public to anon, authenticated;
grant select on table public.ff_home_listings to anon, authenticated;
grant select on table public.ff_listing_details to anon, authenticated;
grant select on table public.ff_listing_media to anon, authenticated;
grant select on table public.ff_makes to anon, authenticated;
grant select on table public.ff_models to anon, authenticated;
```
