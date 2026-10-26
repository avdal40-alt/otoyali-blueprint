# RC4 controlled production runtime proof — 2026-10-27

## Scope and baseline

- HEAD: `d211acd99deae4e4b03393c7b0edf1281d9c8f02`
- canonical project: `dmjifqbvbjewyigdsuco`
- migration parity: 180 local / 180 remote / zero pending
- production deployment remains paused; no migration, deployment, Auth setting,
  SMS, DNS, or environment change was made.

## Zero-row join explained

The initial listing/city inner join returned zero because it excluded all
existing rows, not because `marketplace.listings` is empty:

- 15 listings exist; all 15 have `city_id IS NULL`.
- 20 active KZ cities and 81 active TR cities exist.
- The historical rows are all TRY (2 active, 13 draft).
- There are no RC4/smoke-tagged listings and no RC4/smoke-tagged profiles.

Historical TR rows were not altered or repurposed.

## Local gate

`npm run test:jlc-1508` passed in a detached disposable worktree at the same
HEAD, without `supabase/.temp/linked-project.json` and without production DB
access. Its final JLC-1508 result was `passed`.

## JLC-0521 production runtime evidence

Using an in-session `anon` role and a known legacy TRY listing ID (never
recorded here), public home, detail, search-document, and Search v1 checks all
returned zero rows/items. The locale is not a database market input; the
four-locale presentation invariant remains covered by the passing isolated
release suite.

No valid TR-city fixture can be created through ordinary production writes:
JLC-0522 correctly rejects it. A separately authorized controlled seller and
KZ listing are still required for end-to-end related/dealer/facet path proof.

## JLC-0522 runtime evidence

A transaction-scoped synthetic authenticated actor, KZ city, TR city, and
catalog identifiers were generated only for an RPC attempt; the connection was
not committed and no tagged row persisted. The genuine
`create_own_private_listing_draft` RPC rejected the actor with `OT403 seller
phone verification required` before listing creation. This is the expected
seller-verification boundary. RC4 did not bypass it, send SMS, create a real
user, or weaken the KZ/KZT trigger.

## Legal acceptance runtime evidence

A transaction-scoped authenticated actor successfully inserted and read one
own acceptance record under the deployed RLS policy. A subsequent read-only
check confirmed zero `rc4-tx` records persisted after the session ended. The
schema/grant verification from RC3B remains the evidence for cross-user,
UPDATE, DELETE, and anon denial; an attempted expanded synthetic probe rolled
back before execution because of a test-only UUID literal type error.

## Security and Auth readiness

The fresh Security Advisor introduced no new critical/high finding from RC4.
Existing SECURITY DEFINER/RPC and mutable-search-path findings remain
classified as architecture/defense-in-depth or post-launch hardening. Leaked
password protection remains disabled: `PROVIDER_SETTING_GO_LIVE_BLOCKER`.

No verified controlled KZ seller is available, so no paid +7 SMS was sent.
The production RPC's `seller phone verification required` response confirms
that a real seller write smoke requires an approved verified +7 actor.

## Remaining controlled smoke

1. Owner supplies or authorizes a dedicated verified KZ +7 seller.
2. Create one clearly tagged KZ/KZT draft through the real client/RPC and test
   TR-city/TRY rejection, edit, submit, resubmit, ownership, and staff split.
3. Use that approved KZ record plus a preserved legacy TR ID for related,
   dealer, saved-search, and facet endpoint smoke; retain or clean only the
   explicit temporary listing according to lifecycle policy.
4. Owner enables leaked-password protection and confirms SMS provider/site
   URL/redirect readiness before final Auth smoke.
