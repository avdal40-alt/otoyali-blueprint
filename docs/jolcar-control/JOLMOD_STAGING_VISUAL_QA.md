# Jolmod staging visual QA

## Attempt record — 2026-11-08

- Requested deployment: `dpl_7bjUyUyJFjJd1xLRaBCwfG2HhAe5`.
- Preview URL: `https://jolcar-staging-f03ks000x-otoyali.vercel.app`.
- Commit: `65d21db`.
- Staging database: `uxlenqburgxmkaadlyji`.

## Blocker

The browser visual-QA session is redirected to Vercel Authentication before the
application loads. No automated Vercel login was attempted. Consequently, the
required desktop, 390x844 mobile, and 768x1024 tablet visual inspections and
screenshot evidence could not be truthfully completed in this pass.

Prior authenticated deployment fetches still confirm the public home renders
the four JOLMOD-QA public fixtures and `Jolmod QA Motors`, with the private
draft absent. They are route/data checks only, not substitutes for visual
acceptance evidence.

## Scope protection

No production Vercel project or environment, canonical Supabase project,
database schema, migration, or phone-auth acceptance flow was changed.
