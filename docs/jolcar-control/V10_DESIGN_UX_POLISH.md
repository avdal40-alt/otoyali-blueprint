# V10 Design / UX Polish

**Date:** 2026-10-30  
**Initial head:** `93d315de1a7cf1baa89a9120b88916cd30bfb215`  
**Final application head reviewed/deployed:** `23491ec` (`fix(ui): polish review moderation states`)  
**Final runtime head:** `c8e25dea4e879eff5bd1787e57d04daf35cbe9e8`  
**Branch:** `jolcar/autonomous`  
**Production:** **PAUSED** — no production deployment, migration, database mutation, DNS, alias, or provider setting was changed.

## Scope and outcome

V10 was a presentation-only final polish pass. It preserved Kazakhstan market identity, KZT, the four launch UI locales (`ru`, `kk`, `en`, `zh-CN`), Russian fallback, authentication semantics, RLS, listing lifecycle, JLC-0521/JLC-0522 protections, and all historical Turkey data.

### Design-system and global UI

- **DESIGN_SYSTEM_STATUS:** GREEN. Existing Jolmod tokens, 44px control targets, shared Button/Input/Card/State components, spacing, radius, shadows, and responsive grid contracts were retained rather than introducing a second component system.
- **GLOBAL_UI_STATUS:** GREEN. Shared auth forms now use the common `Input` primitive, so label association, focus/error treatment, control height, and invalid-state behavior are consistent.
- **HEADER_STATUS:** GREEN. Desktop links, brand, profile, and notification controls have visible keyboard focus treatment. The mobile bottom navigation now identifies the active route with `aria-current` and a low-noise selected state.
- **HOME_STATUS:** GREEN by source/design-contract review. Search remains the primary home action; popular-city fallback now defaults to Russian rather than the historical Turkish locale.
- **SEARCH_STATUS:** GREEN by responsive contract checks. Filter drawer retains focus handling, 44px close target, and shared control styling.
- **LISTING_CARD_STATUS:** GREEN. Existing 4:3 media reservation, price/spec hierarchy, responsive grid, favorite control, and image navigation contract remain intact.
- **LISTING_DETAIL_STATUS:** GREEN by source review; gallery, facts, seller CTA, safety links, and mobile CTA structure were preserved.
- **SELLER_WIZARD_STATUS:** GREEN by unchanged prior RC/V9 evidence and responsive source review. No seller or market behavior was changed.

### Account, auth, and moderation

- **AUTH_STATUS:** GREEN. Login, password enrollment/reset, and admin login now share the common password-input control. No OTP or authentication behavior changed.
- **ACCOUNT_STATUS:** GREEN by source review. Existing profile, settings, favorites, saved-search, message, and notification shells retain shared state components and mobile-safe spacing.
- **PASSWORD_UI_STATUS:** GREEN. The V9 current-password reauthentication / no-normal-OTP contract remains unchanged; V10 only aligned the password-entry visuals.
- **ADMIN_STATUS:** GREEN. `/admin/reviews` was the remaining active standalone moderation surface with bespoke Kazakh-only copy. It now supports RU/KK/EN/zh-CN with Russian fallback, shared loading/error/empty states, and existing button primitives. It continues to call the same protected admin APIs and uses no new authorization path.
- **DEALER_STATUS:** GREEN by V9 dealer localisation/regression evidence; no premium dealer functionality was added.
- **VIDEO_STATUS:** GREEN by V9 video localisation evidence; Dealer Live/IVS remains inactive.

### States, responsiveness, accessibility, and localization

- **EMPTY_STATE_STATUS:** GREEN. Shared EmptyState is now also used by review moderation.
- **ERROR_STATE_STATUS:** GREEN. Shared ErrorState provides retry affordance on review-load failures.
- **LOADING_STATE_STATUS:** GREEN. Review moderation shows an announced shared loading state before its protected data is available.
- **MOBILE_STATUS:** GREEN by JLC-0203, JLC-1202, and JLC-1303 source-contract matrices. Mobile nav selected/focus states and filter-drawer close focus treatment were added.
- **DESKTOP_STATUS:** GREEN by JLC-1303 source-contract matrix and remote Preview build.
- **ACCESSIBILITY_STATUS:** GREEN by JLC-0204 and JLC-1203. Clear improvements include shared labeled password inputs, current-page semantics, and visible focus states.
- **I18N_LAYOUT_STATUS:** GREEN for deterministic source checks. No Turkish fallback was introduced; Russian remains the default fallback. Manual visual checks remain for long strings at narrow widths.

## Verification

### Passed in this V10 run

- `npm run test:jlc-0201`
- `npm run test:jlc-0202`
- `npm run test:jlc-0203`
- `npm run test:jlc-0204`
- `npm run test:jlc-1202`
- `npm run test:jlc-1203`
- `npm run test:jlc-1303`
- `npm run test:auth-localization`
- `npm run test:admin-client-localization`
- `npm run test:password-change`
- `npm run test:global-launch-home-copy`
- `npm run test:location-contract`
- `npm run test:country-config`
- `npm run test:jlc-0518`
- `npm run typecheck`
- `npm run lint` (only the existing, documented `SafeImage` raw-`img` performance warning)
- `git diff --check`

### Local runtime constraints

- The original V10 pass recorded local Docker/Supabase availability limits. The final V10.1 gate reran the requested JLC-0521, JLC-0522, and media-security matrices successfully; no Docker-dependent suite remains outstanding for this gate.
- **LOCAL_BUILD_STATUS:** GREEN. `npm run build` completed with exit code 0, including all 47 generated static pages and build traces. The existing SafeImage raw-`img` lint warning remains unchanged.

### Performance and bundle safety

- **PERFORMANCE_IMPACT:** NEUTRAL. No package, font, animation library, image library, or client SDK was added. Changes reuse existing components and dictionaries.
- **BUNDLE_STATUS:** GREEN. The successful staging build produced the expected Next.js route set. The V9 baseline remained approximately shared JS 103 kB, `/search` 272 kB, listing detail 271 kB, and `/sell` 254 kB; V10 added no dependency or bulk client data source.

## Staging Preview / design smoke

- **PREVIEW_STATUS:** READY
- **PREVIEW_DEPLOYMENT_ID:** `dpl_AJ5w5xgx1d8ThNULPJa9dBXrrts1`
- **PREVIEW_URL:** `https://jolcar-staging-nr1xiwzrs-otoyali.vercel.app`
- **PREVIEW_COMMIT:** `23491ec` (local reviewed source at deployment time)
- **PREVIEW_BUILD_STATUS:** GREEN — Preview target only, Ready, 1m12s remote build.

### V10.1 final Preview gate

- **FINAL_PREVIEW_DEPLOYMENT_ID:** `dpl_2fZjdZuEp9mzHQazzgKn2cimxbYM`
- **FINAL_PREVIEW_URL:** `https://jolcar-staging-a5vtv5748-otoyali.vercel.app`
- **FINAL_PREVIEW_COMMIT:** `c8e25dea4e879eff5bd1787e57d04daf35cbe9e8`
- **FINAL_PREVIEW_BUILD_STATUS:** GREEN — immutable Preview deployment to `otoyali/jolcar-staging`, target `preview`, Ready, 46-second remote build. The only source delta from the prior Preview revision `23491ec` is this V10 evidence document; no runtime, test, or configuration file changed.
- **TEST_STATUS:** GREEN. The final gate passed country configuration, JLC-0518, JLC-0521, JLC-0522, the 22-check media authorization matrix, all V10 design/responsive/accessibility checks, auth/admin localization, password change, home copy, and location-contract checks.
- **TYPECHECK_STATUS:** GREEN.
- **LINT_STATUS:** GREEN with the existing SafeImage raw-`img` performance warning only.
- **DOCKER_DEPENDENT_TEST_STATUS:** GREEN — required database-backed suites completed successfully during the final gate.

Browser automation is unavailable because the browser-access host is down. Authenticated `vercel curl` checks against the immutable Preview returned expected responses for `/`, `/ru` (locale redirect), `/kk`, `/en`, `/zh-CN`, `/search`, `/login`, `/register`, `/settings`, `/video`, `/admin/login`, `/admin/listings`, and `/admin/moderation`. `/dealer` returns its expected 404 without a required dealer identifier. Authenticated visual actions were not bypassed.

**MANUAL_VISUAL_CHECKS:**

1. In the Preview URL, inspect `/`, `/search`, a public listing detail, `/dealer/<known-id>`, and `/video` at 320, 375, 390, 414, 768, 1280, and 1440 px. Confirm no horizontal scrolling, clipped chips, or bottom-nav/sticky-CTA overlap.
2. Switch `ru`, `kk`, `en`, and `zh-CN`; check the header, city/filter labels, listing cards, and long labels. Locale changes must remain presentation-only and must not alter KZ/KZT data.
3. As a controlled seller, inspect `/sell`, account settings/change password, favorites, and my listings. Verify common field focus/error styles and that normal password change still does not send OTP.
4. As a controlled moderator, inspect `/admin/reviews`, `/admin/listings`, and `/admin/moderation`. Confirm RU copy is usable and review actions remain protected; do not mutate non-test data merely for visual validation.

## Outstanding design work

- **P0_REMAINING:** None identified.
- **P1_REMAINING:** No safe code-level P1 item remains. The manual breakpoints above require a real browser session because browser automation is currently unavailable.
- **DESIGN_RELEASE_DECISION:** READY. Core visual contracts, responsive/accessibility regressions, typecheck, lint (existing warning only), migration parity, and a fresh staging Preview build are acceptable. Production remains paused.

## Production safeguards

- **MIGRATION_PARITY:** 180 local / 180 remote / 0 pending, read-only verification on canonical project `dmjifqbvbjewyigdsuco`.
- No V10 migration was created or applied.
- No V10 production deployment, alias update, domain/DNS change, Auth setting mutation, or data change occurred.
- Existing non-design release blockers remain owner/provider work: leaked-password protection, final legal operator facts and Kazakhstan legal review, final domain/DNS and Supabase callback configuration, and final authenticated production smoke before unpausing.
