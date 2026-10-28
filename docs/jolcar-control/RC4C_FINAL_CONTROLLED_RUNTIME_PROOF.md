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

- `FINAL_HEAD` before this evidence update: `e173384de940fb5c417619a34d51ce1628ba0df8`.
- `CONTROLLED_LISTING_ID`: `680bb3d0-7210-448e-9187-4702f6a11534`.
- `LISTING_CREATION_STATUS`: `GREEN`. The owner created exactly one fixture
  through the ordinary authenticated fixed-Preview seller UI after the city-ID
  correction. A read-only canonical query bound it to the dedicated controlled
  seller and confirmed Audi A3, 2000, active Almaty city UUID
  `2990421d-405c-459b-9fd2-7193cd27e38e`, KZT 25,000,000, and zero media.
- `LISTING_LIFECYCLE_STATUS`: `GREEN_FOR_SUPPORTED_STATE`. The UI submission
  reached `moderation_status = pending_review` while `status = draft`, which is
  the intended pending-moderation representation. A rollback-only resubmit
  probe from that state was refused (`OT404`); a rejected-only edit/resubmit
  path was deliberately not forced by an unauthorized moderation mutation.
- `ZERO_PHOTO_STATUS`: `GREEN`; zero finalized media and no cover were accepted
  by the normal submission flow, as the current product contract permits.
- `TEMP_DATA_STATUS`: one clearly controlled, pending RC4C fixture retained.
- `TEMP_DATA_CLEANUP_STATUS`: pending a supported owner/UI archive or deletion
  action. It was not altered through an administrative or service-role bypass.
- Recovery check at `81e756c23800af1104e2b9a80a2a798c0e26f931`: the owner had
  signed the dedicated smoke seller into the fixed immutable Preview origin,
  but the local Chrome automation host reported `browser access host is
  unavailable` on two independent checks. The authenticated session was left
  untouched. Consequently, this recovery did not inspect the actor, create a
  listing, or perform any production write.
- `RC4C_BROWSER_ACCESS_STATUS`: `INTERRUPTED_EXTERNAL`.
- `JLC_0522_RUNTIME_STATUS`: `GREEN_FOR_CONTROLLED_SUPPORTED_PATHS`.
  Rollback-only authenticated probes rejected an active TR/non-KZ city with
  `OT422`, TRY with `OT422`, and a forged owner submitting the controlled
  listing with `OT403`. Direct unrelated authenticated mutation was denied
  (`42501`). There is no client/RPC country or market parameter to spoof; the
  trusted market is derived from the canonical city UUID.
- `JLC_0521_RUNTIME_STATUS`: `PARTIAL_GREEN`. As `anon`, the historical TRY
  fixture was absent from home, detail, and search-document reads. The pending
  KZ fixture was also correctly absent from public views. The current canonical
  data set has no active KZ public fixture, so positive public home/search,
  related, dealer, saved-search, facet, and count inclusion cannot be proved
  without an authorized moderation transition. The deployed locale routes
  `ru`, `kk`, `en`, and `zh-CN` were read safely and remained presentation
  routing only; none carries a market input.
- `LEGAL_ACCEPTANCE_RUNTIME_STATUS`: `GREEN`. In one transaction rolled back
  before commit, the controlled actor inserted and read its own acceptance;
  UPDATE and DELETE were denied (`42501`), cross-user INSERT was denied by RLS
  (`42501`), cross-user SELECT returned zero rows, and anonymous INSERT was
  denied (`42501`). A post-rollback read confirmed zero retained probe rows.

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
- The owner subsequently completed that normal fixed-origin sign-in. The only
  remaining browser limitation did not require credential reuse: the owner
  performed the one ordinary seller submission through the fixed Preview UI.
- A fresh Security Advisor read still reports the pre-existing
  `public.service_admin_provider_applications` SECURITY DEFINER view finding,
  mutable-search-path warnings, and intentionally scoped SECURITY DEFINER RPC
  warnings. This RC4C work made no schema, privilege, RLS, or function change,
  and introduced no new advisor finding.

## Recovery regression rerun

- `npm run test:country-config`: PASS.
- `npm run test:jlc-0521`: PASS.
- `npm run test:jlc-0522`: PASS.
- `npm run test:security-final-media-reference`: PASS (22 authorization checks).
- `npm run typecheck`: PASS.
- `npm run lint`: PASS (the pre-existing SafeImage `<img>` performance warning
  remains the only warning).
- `git diff --check`: PASS before this evidence update.
- A local `npm run build` compiled successfully, then stalled during static
  generation without an error or final result; it was stopped locally after
  several no-output polls. The already-recorded fixed Preview Vercel build is
  `Ready` and passed. This local tool stall did not affect Preview or
  production.
- The current rerun again passed country config, JLC-0521, JLC-0522, media
  security (22 checks), typecheck, and lint; the SafeImage warning remains
  pre-existing. The exact reviewed Preview deployment build remains `Ready`.
