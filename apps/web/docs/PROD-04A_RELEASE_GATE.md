# PROD-04A release compatibility gate

This document is the local design and operating proof for the temporary SECURITY-FINAL production cutover. It does not authorize a production change.

## Selected architecture

PROD-04A combines two database-enforced controls:

1. PostgREST runs `public.enforce_release_compatibility` before every request. The singleton state has three modes: `normal`, `maintenance`, and `enforce_minimum`. Normal preserves old/new compatibility before cutover. Maintenance denies every `anon` and `authenticated` table, view, and RPC request. Enforce-minimum requires `x-yolmod-release: 2026082801` or later. `service_role` bypasses the gate for trusted operations.
2. Storage writes are controlled independently by RLS. In maintenance all ordinary writes are denied. In enforce-minimum, the second object-path segment must be `prod04a-2026082801`. New upload code produces this segment; c197069 does not. The design does not assume that the Storage service forwards arbitrary request headers into PostgreSQL.

Activating maintenance also makes `vehicle-photos`, `listing-media`, and `listing-videos` private in the same transaction. The Next.js maintenance response is only UX; it is not the security boundary.

The migration is idempotent. Because its timestamp is later than the already-committed incompatible migrations, operations must install the gate SQL alone as a pre-migration bootstrap and activate it before applying the pending migration chain. When the normal chain later encounters the same file, `CREATE OR REPLACE`, `DROP/CREATE POLICY`, and `ON CONFLICT DO NOTHING` preserve the active state.

## Actual browser-to-Supabase inventory

The application is not a server-mediated architecture. `src/lib/supabase/client.ts` creates a persistent browser client with the public key. Direct browser paths include:

- Auth: login OTP request, OTP resend/verify, session refresh/listeners, `getUser`, `getSession`, sign-out, and auth callback.
- Profile/identity: Profile and Settings reads/writes; OTP profile bootstrap/phone update.
- Sell: catalog reads, profile read/write, rejected-listing RPCs, vehicle profile insert, ownership initialization RPC, listing insert/update, profile-media insert, submit RPC, and listing-media upload.
- Account/listing lifecycle: own-listing reads and lifecycle RPCs, video upload and listing-video insert.
- Other authenticated mutations: favorites, saved searches, listing reports, and service-provider application RPC.
- Browser admin: dashboard reads and several RLS-controlled mutations; listing/service-application review is mediated by Next.js API routes but uses the caller JWT.
- Storage: browser uploads to `listing-media` and `listing-videos`; old c197069 creates public URLs. The historical `vehicle-photos` policies also permit direct authenticated writes even though the current web upload path primarily uses `listing-media`.
- Signed URLs: new shared media helpers call Storage `createSignedUrl`; server queries sign listing media, legacy vehicle photos, and videos. Browser pages also sign authorized media for favorites, Sell, My Listings, and Admin.

Server-side public reads use `src/lib/supabase/server.ts` for listings, cities, makes/models, services, videos, media, booking readiness, and health checks. Two Next.js admin review routes instantiate request-scoped clients with the caller Authorization header. There are no application-owned raw `/rest/v1` fetches or service-role clients in `apps/web`; Supabase JS generates the PostgREST, Auth, RPC, and Storage calls.

Consequently, middleware alone cannot stop an already-open c197069 bundle from using the public Supabase URL and key directly.

## Alternatives evaluated

### A. Minimum-release DB gate alone

Useful after migration, but insufficient by itself for a controlled migration window. Candidate traffic could continue mutating data while schema and policy changes are in progress. It also does not cover Storage unless Storage receives a separate enforceable marker. Retained as the post-migration half of the selected combination.

### B. Maintenance DB gate alone

Safely drains ordinary PostgREST activity without trusting clients, but deactivation after migration would immediately readmit stale c197069 tabs. Retained as the cutover half, followed by enforce-minimum rather than normal mode.

### C. Full old/new compatibility layer

Rejected for this stage. Re-adding profile INSERT/phone mutation, seller-type mutation, and public-bucket behavior would undo the SECURITY-FINAL controls and require maintaining dual behavior across Profile, OTP, Sell, identity triggers, media references, and URL rendering. It is larger and harder to audit than a short controlled stop.

### D. API-key/JWT rotation

Rejected. A legacy anon JWT is coupled to the project JWT secret; rotating it risks invalidating authenticated sessions and service credentials rather than only c197069. Publishable-key lifecycle alone does not prove invalidation of existing legacy keys/sessions in this repository's actual setup. It also has greater accidental-lockout and rollback risk.

### E. Combined maintenance + minimum release + Storage path marker

Selected. It blocks stale browser behavior outside the old JavaScript, preserves trusted service-role recovery, covers PostgREST and Storage without undocumented assumptions, and adds only one state row, small functions/policies, one header, and one path segment.

## Behavior and enforcement proof

| Actor/operation | Normal, pre-migration | Maintenance | Enforce-minimum, post-migration |
| --- | --- | --- | --- |
| c197069 anon read | Allowed | PostgREST rejected | Rejected: marker missing |
| c197069 authenticated read/write/RPC | Allowed | PostgREST rejected, including an existing session | Rejected: marker missing |
| New candidate anon/auth request | Allowed | Rejected; UI is maintenance-only | Allowed with release header |
| c197069 Storage public URL | Existing behavior | Fails after activation makes bucket private | Fails; bucket remains private |
| c197069 Storage write | Allowed before activation | RLS rejects | RLS rejects: release path absent |
| New Storage write | Allowed before activation | RLS rejects | Allowed with release path segment and existing ownership policy |
| Auth/OTP endpoint | Supabase Auth behavior unchanged | Auth can issue/verify OTP, but all PostgREST bootstrap/profile follow-up is rejected | Auth works; new profile follow-up carries marker |
| Browser admin | Existing RLS/admin behavior | Blocked like other authenticated browsers | New marked release works; stale admin UI is blocked |
| `service_role` | Allowed | Allowed for migration/recovery | Allowed for trusted operations |

The pre-request function is method-independent, so the same decision covers public/authenticated reads, Profile writes, listing creation, seller-type attempts, vehicle ownership RPCs, and Sell submission RPCs. Missing, malformed, below-minimum, and absent markers fail closed in enforce-minimum mode. A JWT obtained before activation does not bypass the check because it runs on every PostgREST request.

Auth itself is a separate Supabase service and is intentionally not treated as the boundary. An old user may receive or verify an OTP during the brief window, but the incompatible profile bootstrap, phone mutation, seller mutation, or listing operation cannot pass PostgREST. This is a safe failure, not a partial database write.

Storage reads and writes use different proofs. Privacy activation invalidates c197069 public object rendering. Existing objects remain addressable by the new signed/private flow. Write RLS denies every ordinary actor in maintenance and, afterward, accepts only new object paths while retaining the existing first-folder ownership checks. An old upload therefore cannot create an object that is later connected to an incompatible `profile_media` or `listing_videos` row; even if an orphan upload were somehow attempted, the following PostgREST relationship insert is independently gated.

## Automated test matrix

`npm run test:prod-04a` validates migration contracts, all app markers, maintenance UX wiring, and a modeled 22-case old/new/trusted matrix. `npm run test:prod-04a:db` is local-only and validates the actual PostgreSQL functions, state modes, stale authenticated claims, Profile/Sell boundary, Storage paths, trusted bypass, private buckets, and PostgREST role setting after a clean reset.

The matrix explicitly includes normal old public/authenticated reads and writes; candidate pre-migration traffic; maintenance old/new behavior; missing, malformed, old, and current markers; anonymous and already-authenticated sessions; Storage old/new paths; admin-as-ordinary-browser behavior; and service-role recovery.

## Cutover procedure for PROD-04

Exact project-linking, database credential, backup, change-ticket, and deployment commands remain part of PROD-04 preflight. Before every Supabase command, re-prove the selected project reference and remote migration history. The release-specific ordering is mandatory:

### A. Candidate deployment

1. Confirm production is still on c197069 and take the preflight backup/restore proof.
2. Execute only `supabase/migrations/20260828120000_prod04a_release_compatibility_gate.sql` through the approved direct production SQL channel. Do not use `db push` for this bootstrap: its timestamp follows the six incompatible pending migrations.
3. Verify the installed state is `normal`, `authenticator` has `pgrst.db_pre_request=public.enforce_release_compatibility`, all nine Storage mutation policies call the helper, and existing old-client traffic is unchanged.
4. Deploy this commit as a preview/candidate with `NEXT_PUBLIC_YOLMOD_CUTOVER_MODE=normal`.

### B. Candidate smoke on the old DB

5. Against the old production DB, smoke marked anonymous reads, Auth/OTP, Profile save, Sell/listing creation, new release-segment uploads, signed media reads, and admin review. Verify c197069 still works because the DB mode is normal. Candidate rollback at this point is safe.

### C. Promotion

6. Build the same tested commit with `NEXT_PUBLIC_YOLMOD_CUTOVER_MODE=maintenance` and promote that build. Verify new page/API requests receive the human-readable 503 maintenance response. This is UX preparation, not stale-client enforcement.

### D. Release/maintenance gate activation

7. Activate the external boundary in trusted SQL: `SELECT public.set_release_compatibility_mode('maintenance');` Verify the state is maintenance and `vehicle-photos`, `listing-media`, and `listing-videos` are private.

### E. Stale-client enforcement proof

8. From an old/missing-marker client, prove direct anonymous REST, authenticated REST, Profile mutation, Sell RPC/table mutation, legacy Storage upload, and public-object URLs fail. Repeat with an already-issued authenticated JWT. Verify the current candidate is also DB-blocked during maintenance and a service-role health operation still succeeds.

### F. Fresh recovery point

9. After the gate proof and before schema changes, take the cutover recovery point required by PROD-04. Record the gate state, migration history, bucket flags, application deployment, and successful stale-client/service-role probes.

### G. Six SECURITY migrations plus PROD-04A

10. Apply the pending chain in this exact order:
    1. `20260826120000_security04a_profile_phone_identity_hardening.sql`
    2. `20260827121000_security_final_seller_identity.sql`
    3. `20260827122000_security_final_vehicle_identity.sql`
    4. `20260827123000_security_final_storage_moderation.sql`
    5. `20260827124000_security_final_media_reference_integrity.sql`
    6. `20260827125000_security_final_admin_acl_hardening.sql`
    7. `20260828120000_prod04a_release_compatibility_gate.sql`

    Use the approved PROD-04 migration command only after its linked target and dry-run list exactly match these files. The last file is intentionally re-applied by the tracked migration chain; `ON CONFLICT DO NOTHING` and idempotent DDL must preserve `maintenance` rather than reset it.

### H. Post-migration checks

11. While maintenance remains active, verify all seven migration-history rows, state `maintenance`, private buckets, the PostgREST pre-request setting, nine Storage helper policies, SECURITY-04A privileges, seller/vehicle identity triggers, SFI-001 media integrity, admin ACLs, and service-role recovery. Missing/old markers must still fail.

### I. Authenticated/public/admin/Storage smoke

12. Switch directly from the full stop to the permanent post-cutover boundary: `SELECT public.set_release_compatibility_mode('enforce_minimum');`.
13. Promote the same commit with `NEXT_PUBLIC_YOLMOD_CUTOVER_MODE=normal`.
14. Smoke current-marker anonymous reads, Auth plus profile bootstrap, Profile save, Sell/listing creation, signed approved media, private unpublished media, release-segment uploads, listing video upload, and browser admin workflows. Re-prove missing/malformed/old markers, old Storage paths, and c197069 direct calls fail.
15. If current-release smoke fails, immediately return the DB to `maintenance`, restore the maintenance build, and roll forward a fixed marked release. Do not restore c197069.

### J. Gate deactivation semantics

16. `enforce_minimum` is the only permitted deactivation of the full maintenance stop. Do not call `abort_release_maintenance_before_migration()` and do not set `normal` after any incompatible migration. The maintenance UX may be removed, but the server-side minimum-release boundary remains active through PROD-04 monitoring.

Installing the gate in step 2 and activating it in step 7 are separate on purpose: installation is reversible and traffic-neutral; activation is the explicit stale-client boundary.

## Rollback and roll-forward

Before incompatible DB migrations, abort by keeping/redeploying c197069 and executing `SELECT public.abort_release_maintenance_before_migration();`. That function returns the gate to normal and restores the three buckets' pre-migration public flag. Use it only after verifying none of migrations `20260826120000` through `20260827125000` has been applied.

During maintenance but before those migrations, the same abort is safe. If any incompatible migration has started or completed, do not call the abort function and do not restore c197069.

After migration, rollback to c197069 is prohibited: it lacks the marker, sends forbidden profile/seller mutations, creates legacy Storage paths/public URLs, and cannot satisfy new identity rules. Recovery is roll-forward: keep maintenance or enforce-minimum active, fix the marked candidate, deploy a release marker at or above the stored minimum, validate it, and only then restore normal application UX. `service_role` remains the trusted repair path even when ordinary traffic is stopped.

## Lifetime

The maintenance state and special Storage path marker are temporary release infrastructure. The small minimum-release system is reusable for future incompatible browser/database cutovers. A later reviewed migration may remove the maintenance/Storage special case after c197069 is operationally obsolete; it must not remove the post-migration stale-client boundary during PROD-04.
