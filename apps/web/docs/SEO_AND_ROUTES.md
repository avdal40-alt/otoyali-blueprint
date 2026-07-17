# SEO And Routes

## Public Core Routes

- `/`
- `/search`
- `/video`
- `/listing/[id]`
- `/sell`
- `/login`
- `/profile`
- `/my-listings`
- `/favorites`
- `/settings`

Some of these are public routes that show login-required states for protected actions.

## Locale Routes

Turkish is the default canonical locale and uses the same unprefixed URLs above. Do not link to `/tr` in production UI.

English routes use `/en`:

- `/en`
- `/en/search`
- `/en/video`
- `/en/listing/[id]`
- `/en/sell`
- `/en/login`
- `/en/profile`
- `/en/my-listings`
- `/en/favorites`
- `/en/settings`
- `/en/used-cars`
- `/en/new-cars`
- `/en/electric-vehicles`
- `/en/commercial-vehicles`
- `/en/marine-vehicles`
- `/en/spare-parts`
- `/en/services`
- `/en/insurance`
- `/en/make/[makeSlug]`
- `/en/city/[citySlug]`

Middleware rewrites English route aliases back to the existing internal routes. Query parameter keys remain ASCII and stable across locales.

## SEO Routes

- `/ikinci-el-araba`
- `/sifir-km-araba`
- `/elektrikli-araclar`
- `/otomatik-vites-araclar`
- `/suv-araclar`
- `/marka/[makeSlug]`
- `/marka/[makeSlug]/[modelSlug]`
- `/sehir/[citySlug]`

## Future Vertical Placeholder Pages

- `/ticari-araclar`
- `/deniz-araclari`
- `/yedek-parca`
- `/sigorta`
- `/servisler`
- `/ai-asistan`

Marketplace vertical routes are generated from `src/lib/marketplace/verticals.ts` where possible. `ai-asistan` is a future feature placeholder, not a marketplace vertical.

## Legal And Trust Pages

- `/terms`
- `/privacy`
- `/cookies`
- `/listing-rules`
- `/moderation-policy`
- `/trust`
- `/contact`

## Admin Routes

- `/admin/*`

Admin routes are excluded from sitemap and disallowed in robots.

## Legacy Route

- `/akis` redirects to `/video`.
- `/akis` must not appear in sitemap or user-facing navigation.

## Sitemap Rules

Sitemap is generated in `src/app/sitemap.ts`.

Rules:

- Include public Turkish canonical routes and safe English `/en` routes.
- Include registry-backed vertical landing routes only when they are real public pages.
- Include limited dynamic listing URLs.
- Do not include private routes.
- Do not include admin routes.
- Do not include auth callback routes.
- Do not include `/akis`.

## Robots

Robots config is in `src/app/robots.ts`.

Keep public Turkish and English pages crawlable. Keep private/admin/auth/API/debug routes blocked.
