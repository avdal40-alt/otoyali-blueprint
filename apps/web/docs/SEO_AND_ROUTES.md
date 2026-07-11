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

- Include public routes only.
- Include limited dynamic listing URLs.
- Do not include private routes.
- Do not include admin routes.
- Do not include auth callback routes.
- Do not include `/akis`.

## Robots

Robots config is in `src/app/robots.ts`.

Keep public pages crawlable. Keep private/admin/auth/API/debug routes blocked.
