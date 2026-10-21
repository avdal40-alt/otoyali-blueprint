# JOLCAR OVERNIGHT LAUNCH REPORT

## Result: PARTIAL — do not resume public production traffic yet

The verified Supabase target is synchronized and healthy, local release gates
pass, and a separate Production Vercel project was created and deployed from
the reviewed branch. The first anonymous production smoke revealed a material
market mismatch (Turkey/TL rather than Kazakhstan/KZT). I paused the Vercel
project as a reversible rollback. No production DB or business data was changed.

## JLC-1508

PASS. `npm run test:jlc-1508` passed end-to-end on 2026-10-21: JLC-1302
functional, JLC-1503 security/privacy/RLS, JLC-1407 performance, JLC-1504
resilience, JLC-1505 observability, TypeScript, production build, and
`npm audit --omit=dev --audit-level=high` (zero production vulnerabilities).
Critical First Load JS measured 214–287 kB. `npm run lint` and
`git diff --check` passed; lint retains its existing `SafeImage.tsx` `<img>`
warning.

`npm run test:jlc-0107` passed. Additional `npm run test:country-config` failed
at its Turkey-profile assertion: it expects `yolmodTurkey.brandName` to be
`Yolmod`, while current code sets it to `Jolcar`. This adds evidence of a
country/brand configuration inconsistency; it was not silently waived or
changed during the production rollback.

The prior exit 1 was diagnosed: JLC-1404's nested Next.js build emitted
recoverable webpack cache warnings beyond `spawnSync`'s default 1 MiB output
buffer (`ENOBUFS`). The route-budget assertion was not stale and application
behavior was not changed. Raised only the test harness buffer to 16 MiB, then
reran the full JLC-1508 chain successfully.

## Production Supabase

- Canonical project `dmjifqbvbjewyigdsuco`: `ACTIVE_HEALTHY`, PostgreSQL 17.6,
  `ap-south-1`; URL `https://dmjifqbvbjewyigdsuco.supabase.co`.
- Remote history matches all 172 repository migrations through
  `20261020180216_jlc_0519_staff_seller_dealer_boundary`. The six versions
  absent from local Docker history are present remotely. Migration action was
  a verified NO-OP; no migration ID was created.
- Read-only checks found no RLS-disabled tables in exposed schemas
  `public`, `graphql_public`, `vehicle`, or `marketplace`.
- Supabase Security Advisor reported existing findings, including a
  SECURITY DEFINER admin view. Read-only inspection showed the view filters on
  `is_admin(auth.uid())` and `anon` has no SELECT privilege. The advisor finding
  and other lints were not changed; keep them for security follow-up.
- No production database, Auth, Storage, schema, migration-history, or customer
  data mutation occurred.

## Remote migration reconciliation

PASS / NO-OP. Repository and remote production history both contain 172
migrations, latest `20261020180216_jlc_0519_staff_seller_dealer_boundary`.
No rollback was needed.

## Vercel production

- The authenticated `Oto Hobby` team had no dedicated `jolcar` project; only
  `jolcar-staging`, `otoyali`, and `web` existed. Created separate project
  `jolcar`, ID `prj_EwAVssfFrOkhzQV4tHz0qS9g3ZlK`, linked to
  `avdal40-alt/otoyali-blueprint`, root `apps/web`.
- Configured only Production-scoped `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the canonical Supabase project. Values
  are not recorded in this report. No SMS, AI, or IVS variables were added.
- Production branch tracking is `jolcar/autonomous`.
- A first import-flow deployment from `main` commit `598d510` was canceled
  before serving traffic: deployment `dpl_UfnQ13TWBHwv3Cs7q1Ldzh1t3KiJ`.
- Reviewed branch deployment `J5uw3cdTceopn39kjJT1Thnj5f6w` reached `Ready`
  from commit `902072b`, duration 1m35s. Temporary hostname:
  `https://jolcar.vercel.app`.
- That project is now **paused**. A post-pause read-only HTTP check returned
  503, confirming production traffic is stopped. No new Vercel contract or
  paid integration was created. Root-directory skip behavior was restored
  after the reviewed deployment.

## SMS

PARTIAL / READY FOR USER CREDENTIAL ACTION. Inspected names/presence only across
Jolcar process/user/machine environment, local configuration, Jolcar staging
Vercel variable names, and approved Yolmod configuration sources. No Twilio/SMS
credentials were available; Yolmod documentation showed placeholders only.
Yolmod was not modified. No OTP was sent and no Supabase phone-provider setting
was changed. JLC-0308 remains `READY_FOR_USER_CREDENTIAL_ACTION`.

## Dealer Live and AI/voice

- JLC-0917 Dealer Live/Amazon IVS is post-launch optional; no AWS resources or
  secrets were created. Existing code/abstractions are preserved.
- JLC-1007 external paid AI/voice remains post-launch optional and disabled. No
  paid provider action or secret was created.

## Production smoke

PARTIAL; critical launch mismatch found. Anonymous homepage loaded on the
temporary hostname, but showed Turkish-first metadata/title, Turkish cities,
and public listings priced in TL and located in Adana. Repository evidence
traces this to `ACTIVE_MARKET_PROFILE_KEY = "yolmodTurkey"`; the existing
`jolcarKazakhstan` profile is marked `planned`, Kazakhstan UI locales are not
released, and exact launch locales remain open in the control plan.

No further marketplace/auth/media/seller smoke was run after the material
mismatch. The site was paused; no smoke accounts/listings were created, no
moderation action occurred, and no public/business record was modified.

## Domain / DNS

AWAITING PRODUCT DECISION. The final Jolcar custom domain remains unresolved;
none was guessed or configured. JLC-9004 is blocked only for custom-domain,
DNS, canonical URL, and Auth callback cutover. It did not block temporary-host
deployment or smoke.

## Remaining blockers

1. Product decision: exact Kazakhstan launch locales/default locale. The
   control plan says these remain open; do not silently activate the planned
   profile or invent translations/legal copy.
2. Reviewed Kazakhstan market activation is required before resuming the Vercel
   project. Confirm the existing production listing data's scope before any
   transformation; historical real data must not be deleted or repurposed
   without an approved migration/product decision.
3. Approved Kazakhstan SMS provider credentials or console access for minimum
   real OTP verification and authenticated smoke.
4. Final custom domain decision for JLC-9004 only.
5. Review existing Supabase Security Advisor findings, including the guarded
   SECURITY DEFINER admin view; no advisor finding was waived or altered here.

## Commits and Git

- `9fd0754 test(jlc-1404): tolerate webpack build cache diagnostics`
- `902072b docs(jolcar): correct overnight production launch status`
- `bea3634 docs(jolcar): record production smoke rollback`
- Branch `jolcar/autonomous` was pushed without force; no history rewrite or
  branch deletion. Worktree is clean after the evidence update.

## Cost, rollback, and safety

- Created one Vercel project and one reviewed Production deployment; one
  wrong-branch deployment was canceled. No AWS IVS resources, paid AI/voice,
  SMS, or database migrations were created.
- Rollback: Vercel project `jolcar` is paused and returns HTTP 503. Resume only
  after Kazakhstan market/localization and data scope are resolved and verified.
- No unrelated production data modified. No secret values were printed or
  committed. No force push. No destructive production reset.
