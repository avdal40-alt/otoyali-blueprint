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
  pre-existing. A subsequent local `npm run build` completed successfully:
  compilation, type/lint validation, all 47 static pages, optimization, and
  trace collection passed. The exact reviewed Preview deployment build remains
  `Ready`.

## Final approved-fixture runtime evidence (2026-10-29)

- `INITIAL_HEAD` / `FINAL_HEAD` before this evidence commit:
  `665305c63df3c8f0735419dfd4b324f3eb7c97d2`.
- `CONTROLLED_LISTING_ID`: `680bb3d0-7210-448e-9187-4702f6a11534`.
- `LISTING_STATUS`: `active`; `MODERATION_STATUS`: `active`.
- `APPROVED_AT` / `PUBLISHED_AT`: `2026-10-29T05:23:13.250675+00:00`.
- The owner performed the approval through the normal authorized moderation
  UI. A canonical read-only verification confirmed the listing still belongs
  to the controlled seller and retains Audi A3 / 2000, active Almaty city UUID
  `2990421d-405c-459b-9fd2-7193cd27e38e`, KZT 25,000,000, and zero media.

### JLC-0521 public runtime proof

- `KZ_PUBLIC_INCLUDE_STATUS`: `GREEN`. A transaction-scoped `anon` probe of
  the actual public boundaries returned the controlled listing from
  `ff_home_listings`, `ff_listing_details`, and
  `marketplace.search_listings_v1`; the canonical count RPC returned `1`.
- `TR_PUBLIC_EXCLUSION_STATUS`: `GREEN`. The known historical TRY fixture
  `5ea1f371-13ff-43fb-9bf0-b5b74a60aa08` was absent from the same home,
  detail, and Search-v1 probes. It was not modified.
- `COUNT_ISOLATION_STATUS`: `GREEN`; the anonymous canonical count covers the
  one active KZ listing only.
- `RELATED_ISOLATION_STATUS`: `GREEN_BY_SHARED_BOUNDARY`. Listing detail uses
  `getHomeListings(12)` for its related cards, so it consumes the same
  KZ-filtered public home view. There is no second active KZ listing to render
  an additional related card.
- `FACET_ISOLATION_STATUS`: `GREEN_BY_APPLICATION_FILTER`. Historical city
  catalog rows remain (including TR), while the active application city query
  explicitly requests `ff_cities` with `country_code = CURRENT_MARKET.countryCode`
  (`KZ`). The anonymous KZ public home set contained KZ only.
- `SAVED_SEARCH_ISOLATION_STATUS`: `GREEN_BY_MATCHER_CONTRACT`; the system
  matcher is the JLC-0521 trusted-city predicate used by saved-search
  workflows. No controlled recipient/saved search existed, so no notification
  was created merely for this proof.
- `DEALER_PUBLIC_SURFACE_STATUS`: `N/A`. The controlled fixture is a private
  seller listing, not dealer inventory; no dealer ownership or dealer record
  was created.
- `LOCALE_MARKET_INVARIANCE_STATUS`: `GREEN_BY_SHARED_RUNTIME_BOUNDARY` for
  `ru`, `kk`, `en`, and `zh-CN`: locale is presentation routing only and is
  not accepted by the public views, Search-v1 request, count RPC, or the
  trusted-city predicate. `test:country-config` reconfirmed the canonical
  Russian default/fallback and KZ market configuration.

### Preserved controlled-proof results and cleanup

- `JLC_0521_RUNTIME_STATUS`: `GREEN` for KZ public inclusion and historical
  TR public exclusion, with the non-applicable/private surfaces documented
  above.
- `JLC_0522_RUNTIME_STATUS`: `GREEN`; the existing normal seller-create,
  KZ-city, KZT, submission, spoof-rejection, and ownership evidence remains
  valid, and the approved transition extended its lifecycle proof.
- `LEGAL_ACCEPTANCE_RUNTIME_STATUS`: `GREEN`; the earlier rollback-only RLS
  matrix remains valid and no legal evidence was recreated.
- `TEMP_LISTING_CLEANUP_STATUS`: `MANUAL_OWNER_ACTION_REQUIRED`. The supported
  path is the controlled seller's normal **My listings -> Archive** action,
  which calls owner-only `public.archive_own_listing`; no raw deletion,
  service-role bypass, or administrative status update was used.
- `TEMP_MODERATOR_CLEANUP_STATUS`: `NOT_APPLICABLE`. A read-only check found
  no `admin_users` row created during the RC4C window; the pre-existing
  moderator was not touched.
- Migration parity remains `180 local / 180 remote / 0 pending` from the
  current linked production migration inventory.

### Final local verification

- `npm run test:country-config`: PASS.
- `npm run test:jlc-0521`: PASS.
- `npm run test:jlc-0522`: PASS.
- `npm run test:security-final-media-reference`: PASS (22 checks).
- `npm run typecheck`: PASS.
- `npm run lint`: PASS; unchanged SafeImage `<img>` performance warning only.
- `git diff --check`: PASS before this evidence update.
- `npm run build`: PASS; 47 static pages completed.

### Remaining go-live blockers

- The temporary controlled listing must be archived through the controlled
  seller UI after this recorded proof.
- Leaked-password protection remains a provider-setting go-live blocker.
- Production remains paused; no production deployment, DNS, or Auth-provider
  configuration was changed by RC4C.
