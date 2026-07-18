# Supabase

## Config

Supabase config lives in `supabase/config.toml`.

Confirmed local project id:

```text
Otoyali-blueprint
```

API-exposed schemas in local config:

- `public`
- `graphql_public`
- `vehicle`
- `marketplace`

The `identity` schema exists in migrations but is not listed in the local API schemas.

## Migrations

Migrations live under:

```text
supabase/migrations
```

Run:

```powershell
cd "C:\Проекты\Otoyali-blueprint"
npx.cmd supabase db push
```

If the output includes `Finished supabase db push`, the migration push succeeded. A `no SMS provider enabled` warning means phone auth is not production-ready yet.

## Schemas And Tables

Important schemas:

- `public`
- `vehicle`
- `marketplace`
- `identity`

Important tables/views/functions:

- `public.profiles`
- `public.admin_users`
- `public.admin_audit_logs`
- `public.is_admin(uid uuid)`
- `public.admin_role(uid uuid)`
- `public.ff_home_listings`
- `public.ff_listing_details`
- `public.ff_listing_media`
- `public.ff_makes`
- `public.ff_models`
- `public.ff_akis_videos` (legacy view name, powers `/video`)
- `public.ff_listing_video_counts`
- `public.service_public_categories`
- `public.service_public_providers`
- `public.service_public_provider_details`
- `public.service_public_offerings`
- `public.service_admin_provider_applications`
- `vehicle.makes`
- `vehicle.models`
- `vehicle.vehicle_profiles`
- `vehicle.profile_media`
- `vehicle.profile_ownership`
- `marketplace.listings`
- `marketplace.cities`
- `marketplace.saved_searches`
- `marketplace.listing_favorites`
- `marketplace.listing_videos`
- `marketplace.reports`
- `service_marketplace.categories`
- `service_marketplace.providers`
- `service_marketplace.branches`
- `service_marketplace.offerings`
- `service_marketplace.provider_applications`

Storage buckets confirmed in migrations:

- `vehicle-photos`
- `listing-media`
- `listing-videos`

## Migration Rules

- Prefer additive migrations.
- Do not rewrite shipped migrations unless fixing a known migration-order failure.
- Do not reorder existing public view columns. Append new fields at the end or use a safe drop/recreate plan with grants preserved.
- Preserve grants and `security_invoker` where already used.
- Use `CREATE INDEX IF NOT EXISTS`.
- Keep RLS enabled.
- Keep public guest reads limited to active/public data.
- Keep owner writes scoped to `auth.uid()`.

## FlutterFlow/Public View Note

Some `public.ff_*` views exist as compatibility/public-read surfaces. Keep them stable because they are used by the web app and were also created for FlutterFlow compatibility.

SERVICE-01 adds `public.service_public_*` views for public service discovery and `public.service_admin_provider_applications` for admin-only application review. Public service views must not expose provider owner IDs, private application fields, or moderation notes.
