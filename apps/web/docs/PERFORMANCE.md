# Performance

## Guardrails From PERF-01

- Home listing previews are limited to 12 via `getHomeListings(12)`.
- Search is limited to 60 via `getHomeListings(60)`.
- SEO marketplace pages use limited data, currently `getHomeListings(80)`.
- Sitemap listing URLs are limited, currently `getHomeListings(300)`.
- OTOYALI Video feed loads small batches, default limit 6.
- Listing detail similar listings use a small list, currently 12.

## Query Rules

- Do not use `SELECT *` on public list/card paths.
- Use explicit column lists for card/list queries.
- Use public views for guest browsing.
- Do not fetch full media galleries for every listing card.
- Keep PostgREST payloads small.

Known exceptions/current code to improve later:

- Some authenticated profile/publish flows still use `select("*")`. Do not copy this into public list paths.
- `/debug/supabase` uses diagnostic selects and is production-disabled.

## Video Rules

- Home/Search/SEO pages should render 0 real `<video>` tags.
- Listing cards may show a video badge from `video_count`.
- `/video` may render video elements with `preload="none"`.
- Do not autoplay video on Home/Search.
- Do not add heavy third-party video libraries without a clear need.

## Image Rules

- Prefer card-sized media for cards when variants are available.
- Detail pages can use larger images.
- Gallery/admin thumbnails should prefer `thumb_url`.
- Home/Search/SEO should not use `original_url` under normal variant availability.
- New `/sell` uploads generate browser-side `large`, `card`, and `thumb` variants before upload.
- Legacy rows with only `url` must continue to render.
- Use fixed aspect ratios to avoid layout shift.
- Use lazy loading where appropriate.
- Do not fetch full galleries for card/list pages.

## Verification

Before push/deploy:

```powershell
cd "C:\Проекты\Otoyali-blueprint\apps\web"
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

Manual smoke:

- Home/Search/SEO: 0 real `<video>` tags.
- Home/Search/SEO card images prefer optimized card variants when present.
- Listing detail gallery prefers large variants and thumbnail rail prefers thumb/card variants.
- `/video`: videos do not preload more than needed.
- Sitemap stays bounded.
