# Deployment

> **Jolcar safety notice (2026-10-11):** This is historical OTOYALI deployment
> reference, not a Jolcar deployment runbook or authorization. Jolcar work is
> local-only; do not push, deploy, access production, or apply remote migrations
> without explicit separate authorization. The authoritative Jolcar release
> gates are [MASTER_PLAN](../../../docs/jolcar-control/MASTER_PLAN.md) and
> [TASK_QUEUE](../../../docs/jolcar-control/TASK_QUEUE.json).

## Historical OTOYALI Flow

```text
local commit -> git push -> GitHub main -> Vercel auto deploy
```

This is retained as historical context only. It is not an executable Jolcar
procedure; prepare local evidence only until a separate authorized release
task permits remote action.

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

## Historical Checklist

Do not execute this checklist for Jolcar autonomous work. A future authorized
release task must supply a Jolcar-specific procedure and production evidence.

1. `git status -sb`
2. `cd apps/web`
3. `npm.cmd run lint`
4. `npm.cmd run typecheck`
5. `npm.cmd run build`
6. Review any migration under the applicable local-only migration rules.
7. Stop before remote migration, push, deployment, or production smoke testing.

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
