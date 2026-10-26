# RC3B production migration application — recovered verification (2026-10-26)

## Scope and recovery record

The authorized RC3B migration application completed against the canonical
production project before an unexpected computer shutdown. This recovery pass
performed post-application verification only. It did **not** run `db push`,
`migration up`, migration repair, reset, down migration, DDL, DML, Auth,
deployment, SMS, or any other production mutation.

- Verification time: `2026-10-26T23:07:20+05:00`
- Repository HEAD: `8e04d52c5fb4adb105781e61c5607f3939b08d36`
- Linked production project: `dmjifqbvbjewyigdsuco`
- Project identity is the canonical Jolmod production target, not Otoyali.
- Worktree was clean at recovery verification start.

## Migration parity

The fresh linked migration inventory confirms **180 local / 180 remote / 0
pending**. Every local migration version has a corresponding remote version;
there are no local-only or remote-only entries.

The following eight versions were already present remotely after reboot and
were therefore not reapplied in this recovery pass:

1. `20261021182338_jlc_0521_kazakhstan_public_read_isolation.sql`
2. `20261022064213_jlc_0522_kazakhstan_seller_write_isolation.sql`
3. `20261022065255_jlc_0523_video_analytics_locale_contract.sql`
4. `20261025120000_jlc_0523_legal_acceptance.sql`
5. `20261026001543_jlc_0523_harden_legal_acceptance_grants.sql`
6. `20261026103000_jlc_0110_dealer_import_kz_city_binding.sql`
7. `20261026104000_jlc_0110_dealer_import_column_binding.sql`
8. `20261026105000_jlc_0110_dealer_import_archive_lifecycle.sql`

## Post-application schema verification

### JLC-0521 trusted Kazakhstan public reads — GREEN by schema

- `marketplace.is_jolmod_kazakhstan_city` exists as a fixed-search-path
  SECURITY DEFINER city predicate.
- Public listing-search policy uses that KZ-city predicate.
- Public home and detail views remain security-invoker views and now contain
  KZ city joins/filters.
- Saved-search matcher has the same market guard.

This verifies the deployed definitions. Controlled runtime smoke remains
required to demonstrate fail-closed behaviour for known TR identifiers,
related/dealer reads, and database-backed facets/counts using approved actors
and data.

### JLC-0522 trusted Kazakhstan seller writes — GREEN by schema

- `marketplace.enforce_jolmod_kazakhstan_listing_market` and its BEFORE
  INSERT/market-field trigger exist with a fixed search path.
- The trigger guards city/currency changes, requiring an active KZ city and
  KZT for Jolmod writes without transforming historical TR rows.
- Existing authenticated ownership and staff/moderation boundaries were not
  weakened by this chain.

Controlled authenticated runtime smoke remains required for draft, edit,
submit, and resubmit attempts with an attempted TR/city spoof.

### Legal acceptance — GREEN by schema

- `public.legal_document_acceptances` exists with RLS enabled.
- Authenticated users can SELECT and INSERT only rows whose `user_id` is
  `auth.uid()`.
- Anonymous persistence is denied. Authenticated application roles do not
  have UPDATE or DELETE grants; intentional service-role administration
  remains available.
- The document key/version constraints, primary key, acceptance timestamp,
  and `auth.users` foreign key are present. No historical-user rewrite ran.

### Dealer import chain — GREEN by schema

- The verified import function is seller-scoped and KZ-city/KZT bound.
- The deterministic column-binding hardening is present.
- The archive lifecycle uses the current removed/archived contract, without a
  mass update of unrelated or historical TR listings.

### Video analytics locale contract — GREEN by schema

The locale constraint allows `ru`, `kk`, `en`, and `zh-CN` while retaining
historical `tr`/`en` data compatibility. It changes presentation metadata only
and does not alter market identity or define Turkish as a Jolmod UI fallback.

## Security Advisor (post-application)

The fresh Advisor result contains no new critical or high launch finding
introduced by this eight-migration chain.

- **Expected architecture:** the public KZ-city predicate is a deliberately
  executable, fixed-search-path SECURITY DEFINER predicate with no write path.
  Existing authenticated SECURITY DEFINER RPC advisories remain subject to
  their internal ownership/staff checks and were not blanket-revoked.
- **Defense in depth / existing:** the `service_admin_provider_applications`
  SECURITY DEFINER view remains restricted through its admin predicate; it is
  not anonymously readable.
- **Post-launch hardening:** legacy mutable-search-path warnings are outside
  this migration chain.
- **Provider setting / GO-LIVE blocker:** Supabase leaked-password protection
  is currently reported disabled. No Auth configuration was changed here.

## Local regression and build

Completed after the application/recovery boundary:

- `npm run test:jlc-0521` — PASS
- `npm run test:jlc-0522` — PASS
- `npm run test:security-final-media-reference` — PASS (22 checks)
- `npm run typecheck` — PASS
- `npm run lint` — PASS with the pre-existing SafeImage `<img>` performance
  warning only
- `git diff --check` — PASS
- `npm run build` — PASS

`npm run test:jlc-1508` completed its full local sequence but failed at
`security-04a` because the test deliberately requires
`supabase/.temp/linked-project.json` to be absent. RC3B needs that marker to
remain present to prove and inspect the canonical production link, so the
guard correctly refused to run a local isolation suite in a production-linked
CLI workspace. This is a **harness/environment condition**, not an application
or migration regression. The link marker was preserved; the safety guard was
not weakened or bypassed. Re-run JLC-1508 from an unlinked local-test CLI
workspace before a deployment decision.

## Next authorized controlled smoke (not performed here)

1. Using approved, controlled production actors/data, prove KZ public search,
   detail, related, dealer, saved-search, and facet/count paths cannot expose
   TR records, including a known TR listing-ID attempt.
2. With an approved KZ seller, prove draft creation binds KZ/KZT and rejects a
   TR/city spoof; prove edit, submit, and resubmit preserve that binding.
3. Verify legal acceptance as a user-owned append-only record without exposing
   or altering another user's evidence.
4. Perform the separately authorized minimal +7 Auth/SMS smoke only after
   provider and owner readiness are confirmed.

Production deployment remains paused. No deployment, Auth setting, domain,
callback, environment, or production data change is authorized by this record.
