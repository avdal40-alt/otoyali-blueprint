# OTOYALI Web MVP

OTOYALI Web is the code-first production MVP for OTOYALI.

Production URL: https://otoyali.vercel.app

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

## Quality Checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Production Preview

```bash
npm run start
```

## Vercel Deployment

1. Create a Vercel project from this repository.
2. Set root directory to `apps/web`.
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

The production app must not expose local URLs, service role keys, or the development Supabase debug panel.

## Supabase Dependency

Public browsing uses existing public views:

- `public.ff_home_listings`
- `public.ff_listing_details`
- `public.ff_listing_media`
- `public.ff_makes`
- `public.ff_models`
- `public.profiles`

Home uses `ff_home_listings`, `ff_makes`, and `ff_models`.

Search uses `ff_home_listings`, `ff_makes`, and `ff_models`.

Listing details use `ff_listing_details`, `ff_listing_media`, and a safe fallback from `ff_home_listings`.

Authenticated mutations use existing domain tables:

- `vehicle.vehicle_profiles`
- `vehicle.profile_ownership`
- `vehicle.profile_media`
- `marketplace.listings`

WEB-01 adds one minimal migration for:

- `marketplace.listing_favorites`
- `vehicle-photos` Supabase Storage bucket and policies

## Supabase Seed Note

Demo marketplace data is expected from `supabase/seed.sql`. Home and Search need active rows in `public.ff_home_listings` plus make/model rows in `public.ff_makes` and `public.ff_models`.

If seed data is applied after migrations, reload PostgREST schema:

```sql
notify pgrst, 'reload schema';
```

## Phone OTP Note

Authentication is phone-only through Supabase Auth OTP.

No email login. No password login.

For local testing, make sure Supabase phone auth is configured. If an SMS provider is not configured, login may not be testable outside the local Supabase OTP setup from `supabase/config.toml`.

The UI shows a Turkish SMS provider note and preserves `next` redirects through `/login` and `/otp`.

## Search and Filter Support

Current filters backed by `public.ff_home_listings`:

- text query
- make
- model
- city
- price min/max
- year min/max
- mileage max
- fuel type
- transmission
- only listings with photos
- sort by newest, price, year, mileage

Prepared but hidden/no-op until the view exposes fields:

- negotiable-only
- promoted/hot-only
- body type
- engine volume
- drive type
- color
- condition

Filtering is client-side for Sprint 1. The code is structured so these filters can move server-side later without changing page behavior.

## Hot Listings Monetization Plan

The Home "One cikan ilanlar" block is the future paid placement surface. Sprint 1 uses the first active listings from `ff_home_listings` as a fallback and does not claim they are sponsored.

Future safe extension:

- add optional promotion data such as `is_promoted`, `is_hot`, `promotion_type`, or `promoted_until`
- expose only active promotions through public read views
- keep payment logic out until monetization is explicitly implemented

No Supabase schema change was made for WEB-03.

## App Download Placeholder

The Home app promo and footer links show Android, iOS, and PWA readiness only as placeholders. App Store and Google Play buttons are disabled-style labels and do not link to fake store pages.

## Android Future Path

The web MVP is mobile-first and PWA-ready so the same codebase can power Android later.

Option 1: wrap the stable web app with Capacitor.

Option 2: use Trusted Web Activity / Bubblewrap after Vercel deployment.

Do not build a separate Android app until the web MVP proves the product flow.

## iOS Future Path

After the web MVP is stable, wrap the app with Capacitor, build through Xcode, and distribute with TestFlight before App Store submission.

Do not start iOS native work before the web MVP validates retention-focused flows.

## Known Sprint 1 Limitations

- News is static local content in `src/data/news.ts`.
- Contact seller is auth-gated but shows a Sprint 1 placeholder.
- Similar listings use the current active listings as a lightweight fallback.
- Favorites require the WEB-01 migration to be applied.
- Photo upload requires the `vehicle-photos` bucket migration to be applied, but publishing can proceed without photos for MVP testing.
- Search filters are client-side for Sprint 1 scale.
- Hot listings are visual/promotional placeholders backed by active listings.
- Native app download buttons are placeholders.
- SMS OTP depends on Supabase phone auth and SMS provider configuration.
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

## Next Steps

- Move high-cardinality search filters server-side when listing volume grows.
- Add real promotion fields or a small promotion table only when monetization is ready.
- Replace static news with a CMS only when publishing cadence requires it.
- Configure SMS provider and production auth messaging.
- Add real Android/iOS store links after native release.
