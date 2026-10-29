# V9 final release candidate — in progress

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

## Current verification

- `test:country-config`: PASS.
- `test:jlc-0521`: PASS.
- `test:jlc-0522`: PASS.
- `test:security-final-media-reference`: PASS (22 authorization checks).
- `npm run lint`: PASS with the existing `SafeImage` `<img>` performance
  warning only.
- `git diff --check`: PASS.
- A fresh `npm run build` compiled successfully and completed lint/type
  validation, then the local command did not return after `Collecting page
  data`. This is **not** recorded as a build pass; the previously recorded
  immutable Preview build remains the last successful deployment build.

## Remaining V9 work

- Complete the active-client city-label surface audit (including seller review,
  account/dealer/admin detail paths, metadata, and structured data).
- Complete the systematic Turkish user-facing leakage audit beyond the active
  listing-moderation queue.
- Complete buyer/seller/account/admin release audit and associated targeted
  suites.
- Complete preview-only deployment/smoke after the full local gates are green.
- Recheck Auth provider/SMS/Site URL/redirect settings read-only; leaked
  password protection remains an owner/provider go-live blocker.
- Complete SEO, legal/support, SafeImage/performance, security, and rollback
  evidence. Final domain and legal operator facts remain owner input.

`V9_RELEASE_DECISION`: `NOT_READY` until the remaining release audit, full
verification, and Preview evidence are complete. Production is still paused.
