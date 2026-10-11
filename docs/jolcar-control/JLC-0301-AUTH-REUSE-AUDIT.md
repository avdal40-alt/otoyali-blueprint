# JLC-0301 — Auth reuse audit

**Audited:** 2026-10-11
**Scope:** local source, committed migrations, local test environment, and Git history only. No production, provider, or remote Supabase operation was used.

## Current contract map

| Flow | Reusable implementation and evidence | Jolcar follow-up boundary |
| --- | --- | --- |
| Registration | `AuthOtpStartClient` starts a registration OTP transaction; `OtpClient` verifies it, writes safe profile metadata, then routes unenrolled users to `PasswordEnrollmentClient`. `auth_password_enrollments` contains only the enrollment marker; Supabase Auth remains the password authority. | Reuse the OTP-to-password sequence required by D-006/O-005; do not activate a provider in this task. |
| Routine login | `LoginClient` parses a canonical E.164 number and calls `signInWithPassword`; it redirects legacy users to password enrollment when the authenticated enrollment marker is absent. | Matches D-007: phone plus password, with no routine SMS. |
| Recovery | `AuthOtpStartClient purpose="recovery"` creates a non-signup OTP transaction; after verification `OtpClient` routes to `auth/reset-password`, which uses the password-enrollment component in reset mode. | Reuse for D-008; recovery remains a permitted OTP use. |
| Seller contacts | `verified_seller_contact_phones` holds private active contacts, limits each owner to three, and associates a listing with an explicit contact. Owner-only RPCs expose masked contacts; protected buyer disclosure is through `get_listing_seller_contact`. The start/verify API derives the actor from the bearer token and uses service-only verification RPCs. | Reuse the ownership, cap, masking, explicit-listing-selection, and private-RPC boundaries for D-009/D-010. |

## Security and persistence evidence

- `20261008103000_auth_password_verified_contact_foundation.sql` creates RLS-enabled private enrollment/contact tables; table access is revoked from browser roles and trusted mutators are service-only. Authenticated callers receive only owner-scoped status/list RPCs.
- `20261008124500_complete_own_password_enrollment.sql` exposes a single authenticated actor-derived enrollment marker RPC; it contains no password material.
- `20261010120001_sell_sec_04b3_country_aware_verified_contact_facade.sql` makes protected buyer contact disclosure depend on the listing's selected active contact and does not fall back to the legacy verification table.
- The account-phone sync, listing-contact assignment, and protected disclosure contracts preserve server/database authorization; no browser-supplied user ID is trusted.

## Test inventory and local results

The following local tests passed on the audited tree:

- `npm run test:phone-auth`
- `npm run test:phone-policy`
- `npm run test:auth-signup-metadata`
- `npm run test:launch-b01b1`
- `npm run test:launch-b01b2`
- `npm run test:seller-contact-flow`
- `npx.cmd supabase migration list --local` (history aligned through `20261011100000`)

`npm run test:launch-b01a` was also run against the local database and currently fails at its selected-contact disclosure assertion (`expected +905550001011`, actual `undefined`). Its earlier cap and cross-owner checks deliberately emit expected database errors. This audit records the regression for the task that changes the seller-contact runtime; it was not masked or bypassed here.

## Country-hardcoded assumptions

The reusable mechanisms above are not yet Jolcar-ready without additive country-policy work:

1. `src/lib/market.ts` keeps `yolmodTurkey` active. Its active seller-contact policy uses `TR`, `+90`, `turkey_seller_contact`, and `twilio_verify`; the planned Kazakhstan profile disables seller contacts.
2. Current migrations retain Turkey-specific constraints, function names, purpose values, masking, and eligibility, including `is_turkey_seller_phone_verified`, `phone_not_turkish`, `^[+]90...$`, and the `turkey_seller_contact` challenge purpose in `20261008103000_auth_password_verified_contact_foundation.sql` and `20261010130001_sell_sec_04d_max_active_verified_contacts.sql`.
3. The seller-eligibility route invokes `is_turkey_seller_phone_verified`; seller-contact UI copy and local fixture/runtime tests still describe Turkish contacts and synthetic `+90` numbers.
4. `provider.ts` implements the existing Twilio adapter and reads its configuration only on the server. O-005 requires a provider-neutral Kazakhstan rollout; no real provider is selected or activated.
5. Generic phone parsing can validate Kazakhstan numbers and profile signup metadata can carry `KZ`, but those facts do not replace the persisted Turkey-only seller-contact policy.

## Follow-up implication

The password-first auth and reusable-contact model can be retained. A dedicated additive migration and runtime cutover must replace the persisted Turkey-specific seller eligibility/contact challenge policy with the confirmed Kazakhstan `+7` policy while preserving RLS, service-only mutators, explicit selected-contact disclosure, the three-contact cap, and the zero-OTP reuse path. The recorded local runtime failure must be reproduced and resolved as part of that owned seller-contact change, not by weakening the protected-contact contract.
