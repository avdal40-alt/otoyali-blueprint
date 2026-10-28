# RC4C final controlled runtime proof

Date: 2026-10-28  
Initial HEAD: `659f1408d3a559eb1ad8f42c61ed70f4d3abc5b9`  
Fix HEAD: `d3ee10dc7ad9f6cbc4323b930aa515b80afea308`  
Canonical Supabase project: `dmjifqbvbjewyigdsuco`

## Controlled seller

- `CONTROLLED_SELLER_STATUS`: confirmed dedicated non-customer actor in the
  canonical Auth backend; phone-confirmed, password-enrolled, and with zero
  pre-existing listing ownership.
- The actor was used only through the ordinary authenticated Preview seller UI.
- No phone number, password, OTP, session, or other credential is retained in
  this evidence.

## Previous submission and runtime finding

- `RC4C_PREVIOUS_SUBMISSION`: `NOT_PERSISTED`. A read-only production query for
  the exact RC4C fixture description returned `tagged_listing_count = 0`.
- A single later UI attempt also did not persist a listing. The protected
  `/api/listings` request returned `OT422` and the seller UI showed the generic
  draft-creation failure. No retry was made before diagnosis.
- Root cause: `SellWizard` sent `cityId: null` even though the applied JLC-0522
  KZ market trigger requires the canonical active Kazakhstan city UUID for a
  listing insert. This was an application request-contract regression, not an
  Auth, RLS, seller-verification, or schema failure.

## Correction

- Commit `d3ee10d` resolves the selected city name against the server-provided
  KZ city catalog and sends that UUID to the protected draft endpoint.
- The database still independently derives/enforces KZ market identity from
  that city and requires KZT. No RLS, RPC privilege, trigger, verification, or
  migration was weakened or changed.
- Regression assertion added in `apps/web/scripts/country-config.test.cjs`.

## Verification

- Migration parity: `180 local / 180 remote / 0 pending`.
- `npm run test:country-config`: PASS.
- `npm run test:jlc-0521`: PASS.
- `npm run test:jlc-0522`: PASS.
- `npm run test:security-final-media-reference`: PASS (22 authorization checks).
- `npm run typecheck`: PASS.
- `npm run lint`: PASS (existing SafeImage `<img>` performance warning only).
- `git diff --check`: PASS before the evidence document.
- Preview-only deployment: `dpl_9c9xKsE5uoTyPh2vYp6ihHbuBhG4`, status
  `Ready`, URL `https://jolcar-staging-nkl5rodyz-otoyali.vercel.app`.
  Its Vercel build passed. Production was not deployed or unpaused.

## Runtime-proof status

- `CONTROLLED_LISTING_ID`: none (no RC4C listing persisted).
- `TEMP_DATA_STATUS`: none created.
- `TEMP_DATA_CLEANUP_STATUS`: not applicable.
- `JLC_0522_RUNTIME_STATUS`: pending one normal authenticated seller submission
  against the fixed Preview deployment, then its permitted lifecycle checks.
- `JLC_0521_RUNTIME_STATUS`: prior partial-green read proof remains unchanged;
  the controlled KZ fixture-dependent checks remain pending until the fixed
  submission succeeds.
- `LEGAL_ACCEPTANCE_RUNTIME_STATUS`: prior partial-green status unchanged;
  controlled cross-user/anonymous rollback probes remain pending.

## Security and remaining blockers

- Production Security Advisor was re-read. The known advisor set remains to be
  classified under the existing SECURITY DEFINER/RPC architecture; this pass
  introduced no DB definition or privilege change.
- Leaked-password protection remains a provider-setting go-live blocker.
- The fixed Preview deployment has a different immutable deployment origin from
  the existing authenticated browser session. The session was deliberately not
  copied across origins and no credential was read or reused. To resume the
  controlled proof, the owner must sign the dedicated smoke seller into the
  fixed Preview URL using the normal phone-and-password flow; no OTP or secret
  should be supplied to Codex.
