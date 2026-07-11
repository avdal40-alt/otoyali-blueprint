# CODE-AUDIT-01 - Codebase readiness audit

Date: 2026-07-11

Scope: `apps/web` and current Supabase migrations. This is an audit/report only. No behavior, route, auth, UI, Vercel, or database changes were made.

## 1. Executive summary

Readiness ratings:

- Architecture readiness: 82/100
- Frontend MVP readiness: 78/100
- Backend/Supabase readiness: 72/100
- Security/RLS readiness: 68/100
- Performance readiness: 80/100
- Admin/moderation readiness: 65/100
- Soft-launch readiness: 58/100

The project is past prototype quality and has a coherent MVP architecture: guest-first browsing, production-style Next.js routing, Supabase-backed public reads, real publishing, photo/video support, SEO pages, legal pages, and admin foundations. The main blockers are operational and hardening-oriented rather than architectural: SMS provider, admin bootstrap QA, RLS/storage review, media processing, analytics/monitoring, contact seller completion, and final domain/name decision.

Recommended posture: keep doing local-only safe work until GitHub is healthy. Do not introduce Supabase migrations while deployment is blocked unless there is a critical fix.

## 2. What is solid

- Next.js App Router structure is clear and feature-grouped under `src/app`.
- Guest-first public browsing is preserved for Home, Search, Listing details, Video, SEO, legal/trust, and placeholder vertical pages.
- Progressive auth is implemented for publish, favorites, saved search, report listing, contact seller, profile, my listings, and admin.
- `safeNextPath` protects login return paths from obvious open redirects.
- Public listing reads use `public.ff_*` views and explicit select column lists in core list/detail query helpers.
- Home/Search/SEO routes use bounded listing queries: 12, 60, 80, and sitemap 300.
- OTOYALI Video is isolated to `/video`; cards and SEO pages use metadata/badges rather than video files.
- Supabase migrations have RLS policies, grants, indexes, and public view layers.
- Admin foundation exists with `public.admin_users`, `public.admin_audit_logs`, `marketplace.reports`, `public.is_admin()`, and `public.admin_role()`.
- Legal/trust pages and developer docs exist.
- No `TODO` or `FIXME` hits were found in the audited codebase.
- No frontend `service_role` usage was found.
- No app-source `localStorage` admin trust pattern was found.

## 3. Critical risks before soft launch

- SMS provider is not configured, so phone-first auth is not production-ready.
- Admin owner bootstrap must be tested with a real authenticated user and Supabase `auth.users.id`.
- RLS and storage policies need a manual security review against real anon/authenticated users.
- Contact seller is auth-gated but still a placeholder alert, not a real communication flow.
- Favorites and saved searches exist but need full UX QA and notification expectations should stay modest.
- Listing publishing can leave partial records if vehicle/listing/media steps fail midway; cleanup/transactional server flow is not yet present.
- Media upload works, but compression, thumbnail generation, content moderation automation, and license plate blur are not production-grade.
- OTOYALI Video uses raw uploaded video URLs; no transcoding/poster pipeline is active.
- Legal copy is MVP placeholder text and needs lawyer review before public launch.
- Domain/name is not finalized; DOMAIN-01 is paused.
- No production analytics, error monitoring, alerting, or backup/export plan is documented as active.
- GitHub account is flagged again; do not push or deploy until source/deploy chain is stable.

## 4. High-priority technical debt

- `SellWizard.tsx` is large at about 765 lines. It mixes auth check, profile completion, validation, price suggestion, photo handling, database writes, and UI rendering.
- `AdminClient.tsx` is large at about 678 lines. It mixes access check, dashboard counts, listings, videos, reports, users, settings, audit logging, and UI.
- Some authenticated flows still use `select("*")`: profile, settings, sell profile lookup, and debug health count. Public list/detail paths are explicit, but these should still be narrowed later.
- Error handling often surfaces raw Supabase messages in admin/profile/saved-search/report paths. User-facing production errors should be normalized.
- Listing publishing is client-orchestrated across multiple inserts/uploads. A future Edge Function or RPC could reduce partial-write risk.
- Search filtering is client-side over a limited result set. This is fine for MVP scale but will become incomplete as inventory grows.
- `ff_akis_videos` remains as a legacy public view name for `/video`. It is stable but should be renamed only with a careful compatibility migration if needed.
- `SITE_URL` is hardcoded to `https://otoyali.vercel.app` because DOMAIN-01 is paused. This is correct for current production but not final-domain-ready.
- Many strings are hardcoded in components. Turkish-first is acceptable now, but i18n will need a string catalog.
- `SafeImage` intentionally uses `<img>` and produces the known Next.js optimization warning.

## 5. Supabase and database audit

Confirmed schemas/tables/views:

- `public.profiles`
- `public.admin_users`
- `public.admin_audit_logs`
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
- `public.ff_home_listings`
- `public.ff_listing_details`
- `public.ff_listing_media`
- `public.ff_makes`
- `public.ff_models`
- `public.ff_akis_videos`
- `public.ff_listing_video_counts`

What looks good:

- Public views use `security_invoker = true` in later migrations.
- Public browse views expose active listings/media and avoid private owner internals.
- RLS is enabled on vehicle core, listings, listing videos, admin users, audit logs, and reports.
- Owner-scoped insert/update policies exist for vehicle profiles, ownership, media, listings, favorites, saved searches, and videos.
- Admin policies use `public.is_admin(auth.uid())`.
- PERF-01 added practical indexes for listing, media, video, moderation, and public read patterns.

Risks and follow-ups:

- RLS needs manual test coverage with anon, normal authenticated, listing owner, and admin users.
- Storage policies need manual review for path ownership and public-read boundaries.
- Public view column order must not be changed casually. Append new columns or use a safe drop/recreate plan with grants preserved.
- Admin listing status values are not perfectly uniform with user-facing labels. Code uses listing moderation statuses like `pending_review`, `active`, `rejected`, `archived`; video moderation uses `pending_review`, `approved`, `rejected`, `manual_required`, `archived`.
- No migration should be added while GitHub/deploy is blocked unless there is a critical production fix.

## 6. Auth and access audit

Guest First:

- Public browsing routes remain accessible without login.
- Home, Search, Listing details, Video, SEO, legal, and placeholder vertical pages do not force login.

Progressive Auth:

- `/sell`, `/profile`, `/my-listings`, `/favorites`, saved search, favorite, report, contact seller, and admin all route to login when needed.

Lazy Profile:

- Seller profile completion is requested inside the publishing flow when needed.
- Profile/settings pages read profile data after auth.

Return to Context:

- Login/OTP use `next` and `safeNextPath`.
- Auth-gated actions commonly route to `/login?next=...`.

Risks:

- SMS provider is not ready.
- Contact seller is only a placeholder after auth.
- Auth paths rely on client-side Supabase session checks; protected UX is good, but server-side route protection is limited.

## 7. Admin and moderation audit

What exists:

- Admin routes: `/admin`, `/admin/listings`, `/admin/videos`, `/admin/reports`, `/admin/users`, `/admin/settings`.
- Admin auth check calls Supabase `auth.getUser()`, then `is_admin` and `admin_role`.
- Admin dashboard has counts and recent audit logs.
- Listing moderation can approve/reject/archive.
- Video moderation can approve/reject/archive.
- Reports can move through `reviewing`, `resolved`, and `dismissed`.
- Audit logging helper exists in `AdminClient`.

Risks:

- Admin bootstrap has not been confirmed in this audit with a real owner user.
- Admin UI is a large client component and will be harder to maintain as features grow.
- Audit logging should be checked for every future admin action; some failure cases may not log.
- Admin operations are client-side Supabase mutations, relying heavily on RLS. That is acceptable for MVP but should be manually tested.

## 8. Marketplace UX audit

Home:

- Strong guest-first marketplace landing with listings, brands, cities, SEO entries, video teaser, trust, and app promo.
- Uses 12 listing previews and no video file loading.

Search:

- Client-side filters are ergonomic for MVP.
- Main limitation: filtering only operates on the currently fetched limited result set.
- Saved search inserts into `marketplace.saved_searches`, but notification behavior is future copy only.

Listing detail:

- Gallery, specs, price analysis, trust report placeholder, video poster links, similar listings, favorite, share, report, and seller CTA are present.
- Contact seller is not real yet.

Sell:

- Real client-side publishing exists with profile completion, quality score, price suggestion, photo upload, vehicle profile, ownership, listing, media, and activation.
- Main risk is partial data if later steps fail after earlier inserts/uploads.

Favorites:

- Favorite button and favorites page exist.
- Needs QA for duplicate insert, unauthenticated redirect, empty state, and RLS behavior.

My listings/profile/settings:

- Basic protected account surfaces exist.
- They still use some broad profile selects and need production polish.

Report listing:

- Real `marketplace.reports` insert exists.
- Requires auth and should be manually tested with RLS.

## 9. SEO and content audit

What exists:

- Static and dynamic sitemap generation in `src/app/sitemap.ts`.
- Robots config in `src/app/robots.ts`.
- SEO pages for used/new/electric/automatic/SUV, make, make-model, and city.
- Future vertical placeholder pages.
- Legal/trust pages.
- `/akis` redirects to `/video`.

Strengths:

- Sitemap includes legal and SEO pages.
- Sitemap excludes private/admin/auth/legacy routes by construction.
- Dynamic listing sitemap is limited to 300 public home listings.
- Legal/trust pages are public and lightweight.

Risks:

- Canonical domain is still `https://otoyali.vercel.app`.
- DOMAIN-01 must be resumed only after brand/domain decision.
- Metadata is good enough for MVP, but OG image strategy remains minimal.

## 10. Performance audit

Confirmed by static code scan:

- Home has 0 real `<video>` tags.
- Search has 0 real `<video>` tags.
- SEO pages have 0 real `<video>` tags.
- Only `src/app/video/page.tsx` renders a real `<video>` element.
- `/video` uses `preload="none"`.
- Home uses `getHomeListings(12)`.
- Search uses `getHomeListings(60)`.
- SEO pages use `getHomeListings(80)`.
- Sitemap uses `getHomeListings(300)`.
- Video feed uses `limit: 6`.
- Core list/detail helpers use explicit column lists.
- Vehicle cards prefer `card_url`, then `thumb_url`, then `url`, with cover fallback.

Risks:

- `SafeImage` uses `<img>` and lazy loading; this is simple and flexible, but not Next image optimized.
- Search is client-side and may become incomplete or slow when data grows.
- Admin screens fetch multiple counts/client lists and should stay admin-only.

## 11. Security and privacy audit

Positive findings:

- No frontend service role key usage found.
- No `localStorage` admin trust pattern found in app source.
- `safeNextPath` rejects external URLs and protocol values.
- Reports are not exposed through public views.
- Admin routes are excluded from sitemap and disallowed in robots.
- Debug Supabase route returns 404 in production.
- Legal/trust pages explicitly avoid claiming full vehicle verification.

Needs review:

- RLS policy testing with real roles.
- Storage policy testing for upload/read/delete paths.
- Contact seller privacy model before launch.
- Whether phone/profile fields in `public.profiles` are sufficiently protected by RLS/views.
- Error messages should avoid leaking raw backend details in user-facing contexts.

## 12. i18n and brand readiness

- The product is Turkish-first today.
- Many strings are hardcoded directly in page/client components.
- English routes `/en` and Turkish `/tr` exist, but this is not a full i18n system.
- WEB-11 should introduce a translation/message strategy before the UI grows much further.
- Brand/domain/name may still change. DOMAIN-01 is paused and should stay paused until final decision.
- If name/domain changes, update brand assets, metadata, sitemap, robots, Vercel, Supabase Auth redirects, README, legal pages, and docs.

## 13. Recommended next tasks

1. PROFILE-01 / SELL-02 - seller profile and listing publish polish.
2. SMS-01 / AUTH-02 - production SMS provider and real auth testing.
3. ADMIN-02 - admin bootstrap and moderation QA.
4. ANALYTICS-01 - product analytics.
5. MEDIA-01 - image compression and thumbnails.
6. WEB-11 - Turkish/English i18n.
7. BRAND-02 - logo/header polish if name remains.
8. DOMAIN-01 - resume only after brand/domain decision.
9. WEB-12 - vertical marketplace architecture.
10. AI-01 - AI assistant entry points.

Additional cleanup tasks:

- Split `SellWizard` into smaller hooks/components.
- Split `AdminClient` into route-specific components.
- Replace remaining authenticated `select("*")` calls with explicit columns.
- Normalize user-facing error messages.
- Add manual QA scripts for RLS roles and storage policies.

## 14. Pre-soft-launch checklist

- [ ] GitHub stable.
- [ ] Vercel stable.
- [ ] Domain/name finalized.
- [ ] SMS provider configured.
- [ ] Owner-admin created.
- [ ] Moderation tested.
- [ ] Listing publish tested.
- [ ] Report flow tested.
- [ ] Contact seller tested.
- [ ] RLS reviewed.
- [ ] Storage policies reviewed.
- [ ] Legal copy reviewed by lawyer.
- [ ] Analytics added.
- [ ] Sitemap verified.
- [ ] Robots verified.
- [ ] Backup/export plan reviewed.
- [ ] Monitoring/error alerts configured.
- [ ] No service role key in frontend env.
- [ ] Home/Search/SEO verified with 0 real video tags.

## 15. Final recommendation

The codebase is ready for continued team development and internal QA. It is not yet ready for a public soft launch without auth/SMS, admin bootstrap QA, RLS/storage review, media hardening, analytics/monitoring, contact seller completion, legal review, and final domain/name decisions.

Keep work local-only while GitHub is flagged. Avoid Supabase migrations while deployment is blocked unless a critical migration fix is required.
