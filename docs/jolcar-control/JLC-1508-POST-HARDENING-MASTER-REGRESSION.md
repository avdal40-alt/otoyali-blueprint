# JLC-1508 — Post-hardening master E2E, security, and performance regression

**Scope:** local repository, local Supabase, and local Next.js only. This is a
release gate for local evidence; it does not access, create, configure, or
mutate a provider, staging environment, or production environment.

## Enforced regression gate

`npm run test:jlc-1508` is the final local master gate after the Performance
and Production Engineering Hardening phases. It fails immediately if any
required command fails; no critical regression can be recorded as a pass.

| Required evidence | Enforced command | Coverage retained |
| --- | --- | --- |
| Critical functional E2E | `npm run test:jlc-1302` | Guest/buyer, seller, media, chat, dealer, AI orchestration, and news critical paths. |
| Security, privacy, and RLS | `npm run test:jlc-1503` | Server/database authorization, public privacy, secure media, anti-fraud, client-secret guard, and production dependency pins. |
| Performance budgets | `npm run test:jlc-1407` | Critical response, query/index, media, bundle, background-work, and Search v1 budgets. |
| Provider resilience | `npm run test:jlc-1504` | Timeouts, retry/backoff, idempotency, and degraded typed outcomes. |
| Observability safety | `npm run test:jlc-1505` | Redacted telemetry with correlation, latency, and outcome coverage. |
| Build correctness | `npm run typecheck` and `npm run build` | TypeScript and production build checks. |
| Production dependencies | `npm audit --omit=dev --audit-level=high` | No high or critical advisory in the production dependency tree. |

Through the composed suites, the gate retains `card_url` / `large_url` / `url`
media fallback, `has_video`, `raised_at` ranking, `published_at` semantics,
Search v1 cursor ordering, saved-search and price-drop alerts, seller
analytics, lifecycle triggers, `security_invoker`, RLS/RPC authorization,
country boundaries, and Kazakhstan auth policy.

## Local limits and release boundary

The gate does not waive the previously recorded development-only dependency
audit findings: they remain a release-readiness blocker pending a separately
reviewed toolchain upgrade. It also cannot establish cloud staging/production
health, paid-provider behavior, browser field telemetry, or production
deployment readiness. JLC-9001 through JLC-9005 remain the exclusive manual
authorization chain for those actions.
