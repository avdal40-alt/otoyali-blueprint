# OTOYALI Developer Documentation

This folder is the developer handoff index for the code-first OTOYALI web MVP.

OTOYALI is an AI-first transport marketplace for Turkey. The current web product is guest-first: users can browse, search, view listings, watch OTOYALI Video, read SEO/legal pages, and reach login only when an action needs identity.

## Current Stack

- Next.js App Router under `apps/web`
- TypeScript
- Tailwind CSS
- Supabase JS client
- Supabase Postgres
- Supabase Auth with phone-first OTP
- Supabase Storage for listing photos and videos
- Supabase RLS and SQL migrations
- Vercel deployment
- GitHub as the normal source/deploy trigger

## Current Production

- Production URL: `https://otoyali.vercel.app`
- Current assumption: GitHub may be temporarily flagged, so local commits can exist before push/deploy.
- DOMAIN-01 is paused because the final project/domain name may change. Do not restore the DOMAIN-01 stash until that decision is explicit.

## Important Docs

- [Architecture](./ARCHITECTURE.md)
- [Design System](./DESIGN_SYSTEM.md)
- [Local Development](./LOCAL_DEVELOPMENT.md)
- [Environment](./ENVIRONMENT.md)
- [Supabase](./SUPABASE.md)
- [Deployment](./DEPLOYMENT.md)
- [Auth And Access](./AUTH_AND_ACCESS.md)
- [Admin And Moderation](./ADMIN_AND_MODERATION.md)
- [SEO And Routes](./SEO_AND_ROUTES.md)
- [Performance](./PERFORMANCE.md)
- [Media](./MEDIA.md)
- [Product Roadmap](./PRODUCT_ROADMAP.md)
- [Developer Workflow](./DEVELOPER_WORKFLOW.md)
- [Handoff Checklist](./HANDOFF_CHECKLIST.md)
- [Code Audit 01](./CODE_AUDIT_01.md)

## Working Principle

One stage should produce one focused commit. Do not mix docs, schema, auth, UI, and deployment changes in the same commit unless the task explicitly requires it.

UI work should start from the shared design system in `src/lib/design-system/tokens.ts` and `src/components/ui`. Future product modules should reuse those primitives before adding route-local styles.
