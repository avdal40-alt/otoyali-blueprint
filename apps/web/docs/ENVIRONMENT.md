# Environment

## Active Web Variables

The current codebase reads these frontend-safe variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

They are present in `apps/web/.env.example`.

Rules:

- Do not commit real secrets.
- Do not expose a Supabase service role key in `apps/web`.
- `.env.local` is local-only.
- Vercel environment variables must be configured separately.

## Paused Domain Variable

DOMAIN-01 is paused. If the official domain work returns, it may introduce or standardize:

```bash
NEXT_PUBLIC_SITE_URL=https://final-domain.example
```

Current code still hardcodes the production metadata base through `src/lib/seo/metadata.ts` as `https://otoyali.vercel.app`. Until domain/name is final, production can continue on `https://otoyali.vercel.app`.

When brand/domain changes, update:

- `src/lib/seo/metadata.ts`
- `src/app/sitemap.ts`
- `src/app/robots.ts`
- root metadata and share/canonical logic if DOMAIN-01 is resumed
- Vercel domain settings
- Supabase Auth redirect URLs

## Supabase Auth URLs

Configure Supabase Dashboard -> Authentication -> URL Configuration.

Current local/dev URLs to keep:

- `http://localhost:3000`
- `http://localhost:3000/auth/callback`
- `http://127.0.0.1:3000`

Production currently:

- `https://otoyali.vercel.app`
- `https://otoyali.vercel.app/auth/callback`

To verify before launch:

- SMS provider configured
- production redirect URLs present
- final domain redirect URLs present if domain changes
