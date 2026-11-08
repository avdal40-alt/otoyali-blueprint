# Jolmod staging visual QA

## Preview and access window — 2026-11-08

- Preview tested: `jolcar-staging-f03ks000x-otoyali.vercel.app`.
- Initial deployment tested: `dpl_7bjUyUyJFjJd1xLRaBCwfG2HhAe5` (`65d21db`).
- Fresh deployment after the responsive fix: `dpl_8ViGXTaZZGTuc1sXcEQ34u9Xkd66`
  (`c813924`).
- Staging database: `uxlenqburgxmkaadlyji`.
- A temporary staging-project-only Vercel SSO access window was used for the
  browser session; no share-link URL or token was recorded.
- The app rendered as Jolmod (not the Vercel authentication page) and showed
  the public JOLMOD-QA sale, dealer-sale, zero-km, and rent fixtures. The
  draft fixture remained absent from public results.

## Visual route and locale matrix

- Viewports exercised: 1440x900 desktop, 390x844 mobile, and 768x1024 tablet.
- Locales exercised on the home page: `ru`, `kk`, `en`, and `zh-CN`.
- Routes visually inspected: home/search/cards, QA rent detail, zero-km,
  rent results, sell entry, login (visual only; no OTP), parts, services, and
  specialty vehicles.
- The zero-km page displayed `JOLMOD-QA ZERO KM`; the rent listing detail
  displayed `JOLMOD-QA RENT`; search displayed all four public QA fixtures.

## Findings and fixes

- P1 (fixed): at the 768px breakpoint the desktop header compressed navigation
  labels into a vertical stack. The primary header now begins at `lg`, matching
  the bottom navigation breakpoint so tablet uses the coherent compact shell.
- P2 (open): catalog-origin values such as `Diğer` and `Tofaş` remain visible
  in localized make/model controls. They are catalogue data labels rather than
  an application-string fallback and require a separately scoped catalogue
  localization decision.
- P2 (fixed): the tablet compact-shell change removes the visibly collapsed
  header navigation. Mobile and tablet screenshots were captured during the
  staged browser session as QA evidence.

## Phase 5B follow-up

- Buyer Request UI state: **C**. The repository contains authenticated API
  routes and private database RPCs, but no user-facing page, component, or
  navigation entry. This is a genuine prelaunch implementation blocker, not a
  visual-QA pass.
- QA Auth: the synthetic seed creates email/password Auth users, but generates
  the password when it first creates each user and never persists it. The app's
  normal login is phone/password only. No credentials, OTP, bypass, or real
  user were used, so owner draft/edit and cross-user denial remain untested.
- Catalog: `Diğer` originates from the historic Turkey catalog's generic
  `diger` rows. Active home/search/brand display surfaces now render that slug
  as `Другое`, `Басқа`, `Other`, or `其他`; no database migration is required.
  `Tofaş` is retained as a legitimate proper-name make with dedicated models.

## Validation and safety boundary

- `npm run typecheck`: pass.
- `npm run lint`: pass with the existing `SafeImage` `<img>` advisory only.
- `npm run build`: pass.
- `git diff --check`: pass.
- No phone authentication, registration OTP, password login, or reset OTP was
  run.
- Original Vercel protection was restored after QA: SSO is enabled for
  `all_except_custom_domains`; password and trusted-IP protection remain
  disabled. A clean unauthenticated navigation to the fresh Preview redirected
  to the expected Vercel login layer.
- No production Vercel project or environment, canonical Supabase project,
  database schema, migration, or remote database data was changed.
