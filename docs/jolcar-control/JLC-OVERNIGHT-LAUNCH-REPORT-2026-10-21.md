# Jolcar overnight launch execution record — 2026-10-21

## Current status (deployment/smoke in progress)

Owner authorization covers JLC-0308 and JLC-9001 through JLC-9005. Current
verified state supersedes the earlier report below; no target ambiguity remains
for Supabase.

## Repository and local release gates

- Branch: `jolcar/autonomous`; pre-fix HEAD `ff160b1`.
- `npm run test:jlc-1508`: PASS on 2026-10-21, including JLC-1302 functional,
  JLC-1503 security/privacy/RLS, JLC-1407 performance, JLC-1504 reliability,
  JLC-1505 observability, typecheck, production build, and production dependency
  audit (`found 0 vulnerabilities`). Critical First Load JS was 214–287 kB.
- The first two reruns failed in nested JLC-1404 because recoverable webpack
  cache warnings exceeded Node `spawnSync`'s default 1 MiB output buffer
  (`ENOBUFS`), not because an application assertion failed. Increased only the
  harness output buffer to 16 MiB. Full JLC-1508 then passed.
- Fix committed as `9fd0754` (`test(jlc-1404): tolerate webpack build cache
  diagnostics`) and pushed to `origin/jolcar/autonomous` (new remote branch;
  no force push).
- `npm run lint`: PASS with existing `SafeImage.tsx` `<img>` warning.
- `git diff --check`: PASS.

## Production Supabase and remote migrations

- Canonical project: `dmjifqbvbjewyigdsuco`; state `ACTIVE_HEALTHY`, PostgreSQL
  17.6, region `ap-south-1`; project URL
  `https://dmjifqbvbjewyigdsuco.supabase.co`.
- Remote history has exactly the same 172 migration versions as the repository,
  through `20261020180216_jlc_0519_staff_seller_dealer_boundary`. The six
  migrations missing from local Docker history are present remotely; no remote
  migration is pending. Production migration action is a verified NO-OP.
- Read-only checks confirmed exposed `public`, `graphql_public`, `vehicle`, and
  `marketplace` tables do not have RLS disabled. Supabase security advisor
  findings were not mutated; the reported SECURITY DEFINER admin view has an
  `is_admin(auth.uid())` predicate and no `anon` SELECT privilege. Keep the
  existing advisor lints for follow-up review; no RLS weakening was performed.
- No production DB/schema/data/Auth/Storage change was necessary or made.

## Product scope corrections

- JLC-0917 Dealer Live/Amazon IVS is post-launch optional. No AWS resource or
  IVS secret is required; implementation is preserved.
- JLC-1007 paid external AI/voice is post-launch optional and remains disabled.
- Final custom Jolcar domain remains a product decision. It does not block
  temporary Vercel deployment or smoke.

## Vercel production setup

- Authenticated team `Oto Hobby` had no dedicated `jolcar` project; only
  `jolcar-staging`, `otoyali`, and `web` were present. Created separate project
  `jolcar`, ID `prj_EwAVssfFrOkhzQV4tHz0qS9g3ZlK`, linked to
  `avdal40-alt/otoyali-blueprint`, root `apps/web`.
- Production environment contains only `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, sourced from the verified production
  project. Values are intentionally not recorded here. No AI, IVS, or SMS
  variables were added.
- Production branch tracking is `jolcar/autonomous`. Temporary Vercel hostname
  is `jolcar.vercel.app`; no custom domain was added.
- Project creation's import flow attempted commit `598d510` from `main`, not the
  reviewed branch. That deployment (`dpl_UfnQ13TWBHwv3Cs7q1Ldzh1t3KiJ`) was
  canceled before serving traffic. Dashboard currently shows no Production
  Deployment. Next deployment must use `jolcar/autonomous`.
- Root-directory no-change deployment skipping is temporarily disabled only to
  let the already reviewed branch trigger its first build. Restore it after the
  production deployment completes.

## SMS and secrets

- Inspected names/presence only across Jolcar process/user/machine environment,
  Jolcar local config, Jolcar staging Vercel variable names, and the approved
  Yolmod configuration locations. No Twilio/SMS credentials were available;
  Yolmod documentation contained placeholders only. Yolmod was not modified.
- JLC-0308 is `READY_FOR_USER_CREDENTIAL_ACTION`. No SMS was sent and no phone
  provider setting was changed. Registration OTP and phone/password login
  behavior remain locally covered by JLC-1508; production OTP cannot be proven
  until credentials/provider access are supplied.
- No secret values were printed, committed, or added to task documentation.

## Production smoke and remaining actions

- Production deployment is pending from the reviewed branch. No production
  smoke has been run yet and no smoke data has been created.
- After successful deployment, run anonymous/read-only temporary-host smoke
  (homepage, browse/search, public details, 404, mobile-critical public paths).
  Authenticated seller/moderation/contact smoke depends on SMS activation and
  will remain incomplete if provider credentials remain unavailable.
- JLC-9004 remains blocked only for final custom-domain/DNS/Auth callback
  cutover. No domain has been guessed or configured.

## Safety record

- No unrelated production data modified; no destructive database reset; no
  staging project changed; no AWS IVS resources or paid AI/voice calls created.
- No force push, history rewrite, or branch deletion. Supabase production
  migrations were already synchronized. Canceled only the newly created,
  wrong-branch deployment before it served traffic.
