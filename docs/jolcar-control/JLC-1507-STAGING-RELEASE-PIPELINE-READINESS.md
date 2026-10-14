# JLC-1507 — staging and release-pipeline readiness

**Scope:** local pipeline specification and gate simulation only. This document
does not create, link, inspect, configure, or mutate a cloud staging or
production environment.

## Promotion flow and authority boundary

| Stage | Required outcome | Authority / allowed action |
| --- | --- | --- |
| Local candidate | A clean, committed candidate has passed the mandatory local gates below. | Local repository, Docker, and local Supabase only. |
| Staging admission | A human has authorized an exact staging project, its target identity, secrets, and deployment action; the same candidate SHA is promoted through the approved release process. | Manual authorization required. JLC-1507 performs no cloud action. |
| Production admission | Staging evidence is reviewed, all unresolved release blockers are resolved, and the exact production target and rollout are explicitly authorized. | Manual authorization required; JLC-9001, JLC-9002, JLC-9003, JLC-9004, and JLC-9005 remain the controlling authorization gates. |
| Post-promotion | Authorized operators collect smoke, security, performance, telemetry, and rollback evidence against the exact target. | Manual authorization required; no autonomous production observation or mutation. |

No stage may substitute an environment name, URL, inferred account, or local
container for verified cloud target identity. A failed or missing gate stops
promotion; it must not be waived by documenting the failure as a pass.

## Mandatory evidence gates

The local candidate records the exact commit SHA and terminal output for each
applicable command. Commands run from the repository root unless stated
otherwise. A later release process must execute the same gates against the
candidate SHA; it may add environment-specific gates but may not remove one.

| Gate | Local command / evidence | Required proof |
| --- | --- | --- |
| Repository safety | `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/jolcar/preflight.ps1` | Local-only remote guard, migration-version uniqueness, local history availability, and clean allowed worktree. |
| Source integrity | `git diff --check` and reviewed staged/committed diff | No whitespace errors, unrelated changes, or uncommitted release candidate files. |
| Functional E2E regression | `npm run test:jlc-1302` in `apps/web` | Guest/buyer, seller, media, chat, dealer, AI orchestration, and news critical flows covered by the established master functional gate. |
| Security and privacy/RLS regression | `npm run test:jlc-1503` in `apps/web` | JLC-1301 authorization/RLS/privacy suite plus upload, anti-fraud, client-secret guard, and production dependency audit. |
| Performance regression | `npm run test:jlc-1407` in `apps/web` | Critical response, query/index, media, bundle, background-work, and Search v1 budgets. |
| Reliability and observability | `npm run test:jlc-1504` and `npm run test:jlc-1505` in `apps/web` | Bounded provider failure behavior, idempotency contract, redacted correlation/latency/outcome signals, and provider neutrality. |
| Build and type safety | `npm run typecheck` and `npm run build` in `apps/web` | TypeScript and production build complete without disabling security or correctness controls. |
| Dependency risk | `npm audit --omit=dev --audit-level=high` in `apps/web` | Zero high/critical production dependency advisories. Full development dependency audit findings remain release blockers until separately remediated; JLC-1503 records the current ten high findings. |

The listed functional, security, and performance gates preserve shared
`card_url` / `large_url` / `url` media behavior, `has_video`, `raised_at`,
`published_at`, Search v1 cursor ordering, saved-search and price-drop alerts,
seller analytics, lifecycle triggers, `security_invoker`, RLS/RPC boundaries,
and country/Kazakhstan-auth protections through their composed tests.

## Gate simulation and hand-off record

`npm run test:jlc-1507` is a local specification guard. It verifies that this
pipeline retains every mandatory gate, references only existing local package
scripts, identifies the JLC-9001, JLC-9002, JLC-9003, JLC-9004, and JLC-9005 manual authorization chain,
and explicitly prohibits cloud mutation. It is not a replacement for the
gates it names.

Before an authorized staging or production change, the operator must attach:

1. the candidate SHA and clean-worktree/preflight output;
2. terminal output for every mandatory local gate, including exact tool
   versions and test/build timestamps;
3. exact authorized target identity and environment classification, verified
   separately from local configuration;
4. the approved migration/deployment/rollback plan, with a forward-only
   migration review and a no-reset/no-destructive-data statement; and
5. authorized target-specific smoke, security/privacy, performance, and
   observability evidence after promotion.

No `supabase db push`, remote migration repair, deploy, provider activation,
DNS change, or production restore belongs to this local pipeline. Those actions
remain stopped until the relevant manual authorization task is completed.

## Current local limitation

This repository has no authorized staging or production identity, credentials,
or provider configuration. Consequently JLC-1507 proves that the promotion
contract and local gate wiring are explicit; it does not claim cloud pipeline
execution, staging health, production readiness, or provider activation.
