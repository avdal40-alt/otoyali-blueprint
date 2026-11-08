# Jolmod Staging Rollout

**Run date:** 2026-11-08 (Asia/Qyzylorda)  
**Project:** `uxlenqburgxmkaadlyji` (South Asia / Mumbai, `ap-south-1`)  
**Canonical project:** `dmjifqbvbjewyigdsuco` — unchanged

## Deployment evidence

- Repository HEAD: `8a74a86806701b451bbed684fe031e22a79ae1aa`
- Branch: `jolcar/autonomous`
- Supabase CLI: `2.115.0`
- Linked project, confirmed before write: `uxlenqburgxmkaadlyji`
- Initial remote application migration count: 0
- Local migration count: 198
- Dry-run pending migration count: 198
- Applied migration count: 198
- Final remote migration count: 198
- Final migration: `20261104180000_jlc_1606_profiles_anon_privilege_hardening`
- Migration history matches the repository migration chain.
- No seed command or Vercel change was made. No remote action was performed against canonical.

## Schema and contract smoke

The staging database contains the expected principal schemas:

- `public`: 6 tables, 13 views
- `marketplace`: 44 tables
- `identity`: 13 tables
- `extensions`: 2 views

Representative objects exist for profiles, listings and V2 category details, verified seller contacts, dealer CRM, Buyer Requests, notifications, parts, insurance interests, and specialty listings. Contract discovery also confirmed marketplace search, listing detail/draft-edit, dealer import, Buyer Request, parts, insurance, and specialty RPC surfaces.

## Data API configuration

Repository configuration requires these exposed API schemas:

- `public`
- `graphql_public`
- `vehicle`
- `marketplace`

`extensions` is configured as an extra request search path, not as an exposed API schema. The cloud Data API dashboard route did not disclose its schema list in this validation session, and database settings do not expose the hosted PostgREST configuration. Because the staging project was created with automatic exposure disabled, its hosted exposure list must be explicitly verified before switching Vercel; ensure it includes the four schemas above, especially `marketplace`. No broad grants or RLS changes were made.

## Security smoke

Direct table-boundary checks passed:

- `anon` has no `SELECT` grant on `public.profiles` (RLS enabled).
- Seller-contact disclosure tables have no anonymous `SELECT` grant (RLS enabled).
- `marketplace.listings` is readable to `anon` only through its active-listing RLS policy.
- Buyer Requests, dealer leads, parts listings, and specialty-contact disclosures have no anonymous `SELECT` grant and have RLS enabled.
- Public listing views (`ff_home_listings`, `ff_listing_details`, `ff_listing_media`) use `security_invoker=true`.

## Advisor result — blocking

The security advisor reports one **ERROR**:

- `public.service_admin_provider_applications` is a `SECURITY DEFINER` view.

The view is selectable by `anon` and `authenticated` and projects sensitive provider-application fields, including contact data and moderation fields. Its current predicate is `is_admin(auth.uid())`; anonymous evaluation returns false, so no anonymous rows are presently returned. Nevertheless, the view runs with definer privileges, bypasses base-table RLS, and has an anonymous grant. This is a blocking prelaunch hardening issue until the view is made `security_invoker` or otherwise moved behind a narrowly authorized, audited boundary.

Security advisor informational findings also identify RLS-enabled/no-policy tables intended as deny-by-default internals. Performance advisor: no ERROR-level findings; warning-level index and multiple-permissive-policy findings were not changed in this rollout. CLI 2.115.0 supports only `security` and `performance` advisor types; no CLI health advisor is available.

## Outcome

Migration bootstrap succeeded, but prelaunch validation is blocked on the security-definer view and unverified hosted Data API schema exposure. Do not seed QA data or switch Vercel preview until those issues are resolved and revalidated.

## Migration 199 — service-admin application hardening

Migration `20261108042526_harden_service_admin_provider_applications` was created as a forward-only fix and applied after the original 198 migrations.

### Root cause and access model

`public.service_admin_provider_applications` is consumed by the browser admin client and projects private provider-application identity, contact, and moderation data. The prior view ran as `SECURITY DEFINER`; it was selectable by client roles and bypassed the underlying provider-application RLS boundary.

The application intentionally withholds moderation-only columns from generic authenticated direct-table access. Making the view merely `security_invoker` would therefore break the admin client unless those private columns were broadly granted. Migration 199 instead selects the narrow authorized-RPC model:

- sets the legacy view to `security_invoker=true`;
- revokes its `SELECT` access from both `anon` and `authenticated`;
- adds `public.list_service_admin_provider_applications(p_status, p_limit)` as a fixed-search-path `SECURITY DEFINER` RPC;
- requires `auth.uid()` to be an active admin before returning a row;
- revokes `PUBLIC`/`anon` execution and grants execution only to `authenticated`;
- updates the admin browser client to use the RPC.

### Validation

- 199-migration local replay from zero: PASS (`supabase db reset --local --no-seed`).
- Disposable local authorization smoke: PASS. An authenticated non-admin receives an authorization error; an authenticated admin reads the expected application row. Test data was rolled back.
- Relevant service test: PASS.
- JLC-1302 aggregate: PASS.
- Typecheck: PASS. Lint: PASS with one pre-existing `SafeImage.tsx` `<img>` warning. Build: PASS. Diff check: PASS.
- Two unrelated runtime scripts were not clean in the linked local environment: admin-moderation hit a pre-existing `create_own_private_listing_draft` privilege denial, and SECURITY-04A intentionally rejects the present linked-project marker. Neither script exercised or changed migration 199.

### Remote staging verification

- Staging migration count before apply: 198.
- Dry-run pending plan: exactly migration 199.
- Staging migration count after apply: 199; latest version `20261108042526`.
- View has `security_invoker=true`; `anon` and `authenticated` no longer have `SELECT` on it.
- `anon` cannot execute the RPC; `authenticated` can execute it and the function performs the admin check.
- Existing profile, seller-contact, Buyer Request, dealer-lead, and specialty-contact anonymous-denial checks remain intact.
- The Security Advisor no longer reports the prior `security_definer_view`; ERROR-level security findings are now empty.

The remaining hosted Data API exposed-schema configuration is intentionally deferred to its separate Dashboard-managed configuration task. No QA data was seeded and no Vercel or canonical-project change was made.
