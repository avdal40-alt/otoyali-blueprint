# Handoff Checklist

## Local Setup

- [ ] Clone or open `C:\Проекты\Otoyali-blueprint`.
- [ ] Install Node.js.
- [ ] Install Supabase CLI.
- [ ] Docker installed if running local Supabase.
- [ ] Run `npm.cmd install` in `apps/web`.
- [ ] Run `npm.cmd run dev`.
- [ ] Open `http://localhost:3000`.

## Environment Variables

- [ ] `NEXT_PUBLIC_SUPABASE_URL` configured locally.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured locally.
- [ ] No service role key in frontend env.
- [ ] Vercel env vars configured separately.
- [ ] Supabase Auth redirect URLs configured.

## Supabase Access

- [ ] Supabase project access granted.
- [ ] SQL editor access confirmed.
- [ ] Auth Users access confirmed.
- [ ] Storage buckets visible.
- [ ] RLS policies reviewed.
- [ ] `npx.cmd supabase db push` tested on a safe environment.
- [ ] SELL-02 migration applied: `20260715120000_sell02_publish_journey_rls.sql`.

## Vercel Access

- [ ] Vercel project access granted.
- [ ] Root Directory set to `apps/web`.
- [ ] Production Branch is `main`.
- [ ] Env vars present.
- [ ] Deployment logs accessible.

## Auth/SMS

- [ ] Phone OTP tested locally or in staging.
- [ ] SMS provider selected.
- [ ] SMS provider configured in Supabase.
- [ ] Friendly unavailable-SMS error verified.
- [ ] `/login?next=/admin` returns to admin after auth.

## Admin Bootstrap

- [ ] Owner logs in once.
- [ ] Owner `auth.users.id` copied.
- [ ] `public.admin_users` owner row inserted.
- [ ] `/admin` loads for owner.
- [ ] Non-admin user denied.

## Production Deployment

- [ ] `git status -sb` clean except intended changes.
- [ ] `npm.cmd run lint` passed.
- [ ] `npm.cmd run typecheck` passed.
- [ ] `npm.cmd run build` passed.
- [ ] Migrations pushed if present.
- [ ] GitHub account healthy before push.
- [ ] Vercel deployment reaches `Ready`.
- [ ] Smoke routes pass.

## SEO

- [ ] `/sitemap.xml` loads.
- [ ] `/robots.txt` loads.
- [ ] Admin/private/auth routes excluded from sitemap.
- [ ] `/akis` excluded from sitemap.
- [ ] `/akis` redirects to `/video`.
- [ ] Legal pages are crawlable.

## Performance

- [ ] Home renders 0 real `<video>` tags.
- [ ] Search renders 0 real `<video>` tags.
- [ ] SEO pages render 0 real `<video>` tags.
- [ ] List/card pages use limited explicit selects.
- [ ] `/video` keeps `preload="none"` or minimal loading.
- [ ] Sitemap listing count remains limited.

## Security

- [ ] No service role key in frontend.
- [ ] RLS reviewed for owner/admin paths.
- [ ] Storage policies reviewed.
- [ ] Public listings require `status = active` and `moderation_status = active`.
- [ ] Owner can read their own pending listing media.
- [ ] Admin functions reviewed.
- [ ] Report flow private.
- [ ] Debug route disabled in production.

## Pre-Soft-Launch

- [ ] SMS provider configured.
- [ ] Admin owner created.
- [ ] Legal copy reviewed by lawyer.
- [ ] Domain decision finalized.
- [ ] Domain connected.
- [ ] Sitemap verified.
- [ ] Robots verified.
- [ ] Storage policies verified.
- [ ] RLS reviewed.
- [ ] Report flow tested.
- [ ] Listing moderation tested.
- [ ] Seller publishing flow tested.
- [ ] Guest `/sell` redirects to `/login?next=/sell`.
- [ ] Publish creates hidden pending-review listing.
- [ ] `/my-listings` shows pending/rejected/archived/live states correctly.
- [ ] Contact seller flow tested.
- [ ] Analytics installed.
- [ ] Backup/export plan reviewed.
