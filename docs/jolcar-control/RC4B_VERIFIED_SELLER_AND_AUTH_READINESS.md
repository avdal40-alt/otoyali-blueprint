# RC4B verified seller and Auth/provider readiness — 2026-10-27

## Verified baseline

- HEAD: `d08a8cabc843e0e2821123020d2d31600d454114`
- canonical project: `dmjifqbvbjewyigdsuco`
- migration parity: 180 local / 180 remote / zero pending
- production remains paused; no migration, deployment, Auth setting, SMS, DNS,
  callback, or production data mutation was performed.

## Controlled verified seller

`CONTROLLED_VERIFIED_SELLER = NEEDS_CREATION`.

Read-only aggregate inspection found two +7 verified seller contacts, but no
profile marked RC4, smoke, or test; one has existing listing ownership. They
are treated as real accounts and were not used. No full phone, user ID,
credential, token, or OTP was read or recorded.

## Auth and SMS readiness

- **Phone seller-verification boundary:** enforced. RC4's transaction-scoped
  draft RPC was rejected with `OT403 seller phone verification required`.
- **Password login:** locally covered by isolated JLC-1508.
- **SMS provider / health / KZ +7 delivery:** not accessible through the
  linked CLI's read-only database/API surface; no SMS was sent.
- **Site URL / redirect URLs / callback readiness:** not accessible through
  the current read-only CLI session; requires Auth dashboard/project-owner
  verification.
- **Leaked password protection:** disabled according to the Supabase Security
  Advisor. It remains `NEEDS_OWNER_AUTH_SETTING_ACTION`.

Repository inspection also found historical seller-contact migrations and
function names containing Turkey-specific terminology/constraints. Although
the live aggregate has +7 contacts, this requires a separate compatibility
audit before any KZ Auth provider change; RC4B made no change to it.

## Runtime proof status

- **JLC-0521:** partial green from RC4: the existing legacy TRY row is absent
  from anonymous home/detail/search documents/Search v1. Full related/dealer/
  saved-search/facet proof requires a controlled KZ fixture.
- **JLC-0522:** needs a dedicated verified seller. The system correctly
  refuses an unverified synthetic actor; verification was not spoofed.
- **Legal acceptance:** partial green from RC4: a rollback-only authenticated
  own insert/read succeeded and no evidence persisted. Schema policies remain
  the cross-user/update/delete/anon proof until two controlled actors exist.

## Local regression

- isolated `npm run test:jlc-1508`: PASS (includes build/typecheck/audit)
- `test:jlc-0521`: PASS
- `test:jlc-0522`: PASS
- `test:security-final-media-reference`: PASS (22 checks)
- typecheck: PASS
- lint: PASS with existing SafeImage performance warning

## Exact owner actions

1. Supply or authorize a dedicated non-customer KZ +7 phone for one minimal
   registration/OTP/password smoke, and retain its owner credentials outside
   repository evidence.
2. Verify production SMS provider credentials, KZ delivery, Site URL, allowed
   redirects, and callback configuration in the Supabase Auth dashboard.
3. Enable Supabase leaked-password protection through the supported Auth
   dashboard setting, then record its state.
4. Authorize use of that dedicated verified seller for the remaining KZ/KZT
   listing lifecycle and two-actor legal-acceptance smoke.
