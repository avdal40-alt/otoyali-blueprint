# Deployment

## Current Normal Flow

```text
local commit -> git push -> GitHub main -> Vercel auto deploy
```

Current issue: GitHub may be temporarily flagged. While flagged, do not push new changes. Prepare local commits only.

## Vercel Configuration

Confirmed/project convention:

- Root Directory: `apps/web`
- Framework: Next.js
- Production Branch: `main`
- Environment variables configured in Vercel

Required env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Domain

Current production:

```text
https://otoyali.vercel.app
```

Official domain work is paused:

- `otoyali.com` is owned but not connected yet.
- DOMAIN-01 stash exists according to task context.
- Do not restore DOMAIN-01 until brand/domain decision is final.

## Deployment Checklist

1. `git status -sb`
2. `cd apps/web`
3. `npm.cmd run lint`
4. `npm.cmd run typecheck`
5. `npm.cmd run build`
6. If a migration exists: `cd ../..` then `npx.cmd supabase db push`
7. `git push` only when GitHub is healthy
8. Wait for Vercel status `Ready`
9. Smoke check public and protected routes

Smoke routes:

- `/`
- `/search`
- `/video`
- `/akis` redirects to `/video`
- `/listing/[id]`
- `/sell`
- `/login`
- `/admin`
- `/sitemap.xml`
- `/robots.txt`
