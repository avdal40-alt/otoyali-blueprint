# V9 final release candidate

Date: 2026-10-29  
Initial HEAD: `cabb66967b3a6cfc440b29508215e2766ae49439`

## Verified baseline

- Worktree was clean at the start of V9.
- Canonical linked Supabase project: `dmjifqbvbjewyigdsuco`.
- Migration parity: `180 local / 180 remote / 0 pending`.
- The RC4C Audi fixture `680bb3d0-7210-448e-9187-4702f6a11534` is archived
  through the supported lifecycle (`status = removed`, `moderation_status =
  archived`, archived 2026-10-29). Its KZ city and KZT values remain intact.
- No temporary RC4C `admin_users` row was found with unambiguous provenance, so
  no staff privilege was changed. The pre-existing moderator remains untouched.
- Production remains paused. No migration, deployment, Auth-provider setting,
  DNS, or production data change was made in V9.

## Completed V9 code slices

### Kazakhstan city presentation

- Commit `e2b43ec` adds one presentation-only KZ city-label boundary covering
  the complete active 20-city catalog.
- The stable database city name, UUID, and slug remain request/query identity;
  only visible labels change.
- RU, KK, EN, and zh-CN labels are provided; Russian is the safe fallback.
  Unknown KZ labels preserve canonical KZ text and never use Turkish.
- The shared formatter now drives listing/filter/card labels, homepage popular
  cities, and SEO internal city links.
- `test:location-contract`, `test:format`, and typecheck passed.

### Seller description language contract

- Commit `2908d87` separates seller-description language from UI locale.
- Only `ru` and `kk` are accepted as generated-description languages.
  Any missing, malformed, EN, zh-CN, TR, or other value normalizes to `ru` on
  the server. UI defaults are RU for ru/en/zh-CN and KK for kk.
- The seller UI exposes only Russian and Kazakh choices. General AI remains
  unchanged and multilingual.
- `test:jlc-1005` and typecheck passed.

### Authenticated password change

- Commit `19ff63f` adds **Settings → Security → Change password**.
- It re-verifies the authenticated user through their own phone/password,
  then calls authenticated `updateUser` with the new password. The flow does
  not invoke OTP/SMS APIs; recovery remains separate.
- It enforces the existing ten-character minimum, confirmation equality, and
  difference from the current password. It has RU/KK/EN/zh-CN UI copy.
- `test:settings-localization`, `test:password-change`, and typecheck passed.

### Admin moderation copy

- Commit `c227499` localizes the active listing-moderation queue's critical
  labels (title, pending/approved/rejected/archived states, quality, approve,
  reject, open, errors) for RU/KK/EN/zh-CN. It does not change staff guards,
  RPCs, or moderation semantics.
- `test:admin-client-localization` and typecheck passed.

## Final V9 verification

- `test:country-config`: PASS.
- `test:jlc-0521`: PASS.
- `test:jlc-0522`: PASS.
- `test:security-final-media-reference`: PASS (22 authorization checks).
- `npm run lint`: PASS with the existing `SafeImage` `<img>` performance
  warning only.
- `git diff --check`: PASS.
- `test:jlc-0518`, `test:jlc-1005`, `test:password-change`,
  `test:dealer-page-localization`, `test:video-localization`, and
  `test:admin-client-localization`: PASS.
- A fresh local production build is GREEN: compilation, type validation, all
  47 static pages, page optimisation, and trace collection completed. The
  earlier apparent page-data stall was a command-output boundary issue: the
  Next trace records a complete build, and the bounded rerun completed.
- Final bundle evidence remains within the established baseline: 103 kB shared
  first-load JS, `/search` 272 kB, listing detail 271 kB, and `/sell` 254 kB.
- Lint is acceptable with the existing deliberate `SafeImage` `<img>` warning
  only. The component supports arbitrary sanitized seller URLs and media
  variants; changing it to `next/image` without an approved remote-loader
  policy would be riskier than the warning.

## Final localisation audit

- Commit `f4f762e` localises the remaining active admin dashboard, video
  moderation, reports, users, settings, dealer-follow, video-share and vehicle
  gallery controls for RU/KK/EN/zh-CN. It also localises city presentation in
  city SEO pages, service-provider branches, and admin rows.
- Filter values remain canonical machine values; active display labels are
  generated through locale-aware formatters. Removed Turkish-only unused option
  labels from the active search-filter module.
- Historical Turkish compatibility dictionaries and Turkey records remain
  intact, but unreleased Turkish cannot become a Jolmod fallback. Russian is
  the fallback for unsupported launch display paths.
- Deferred Dealer Live is not activated or included in launch smoke scope.

## Preview / RC5

- Preview-only deployment: `dpl_FSqjvtcjeHffK9WoHiSnfYFPaepW`.
- Immutable URL: `https://jolcar-staging-ed2r0wi0r-otoyali.vercel.app`.
- Target: `otoyali/jolcar-staging` (root `apps/web`), never the production
  `jolcar` project. Vercel status: READY; build duration 1m18s.
- Unauthenticated route probes returned redirects as expected for the Preview
  protection/runtime boundary. One first DNS lookup transiently failed; no
  application 4xx/5xx evidence was observed. Authenticated Preview smoke must
  be performed normally by the owner; no session or credential bypass was used.

## Provider, legal, domain, and release plan

- Production database parity remains `180 local / 180 remote / 0 pending`.
  V9 made no migration or production data mutation. Production remains paused.
- Phone registration and normal phone/password login were proven in RC4C. The
  provider-side leaked-password protection remains disabled and is a required
  owner setting before public launch.
- Owner must supply legal entity/operator facts, Kazakhstan counsel review,
  final domain/DNS choice, Supabase Site URL and redirect/callback allowlist.
  No facts have been invented in code or copy.
- Cutover sequence: enable leaked-password protection; enter approved operator
  facts; configure final domain/DNS and matching Supabase Site URL/redirects;
  deploy the reviewed commit to paused production; verify environment values;
  run protected owner smoke (registration, password login, sell, moderation,
  public search, legal pages); approve GO/NO-GO; unpause. Roll back by restoring
  the prior Vercel deployment/alias and provider URL settings; do not use a
  destructive database rollback.

## Release decision

`V9_RELEASE_DECISION`: `READY_FOR_OWNER_CUTOVER`.

No V9 code, build, KZ/KZT isolation, or media-security blocker is known.
Remaining go-live blockers are owner/provider/legal/domain actions above plus a
normal authenticated Preview smoke. Production is still paused.
