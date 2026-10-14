# JLC-1505 — Observability and SLO readiness

## Telemetry contract

`apps/web/src/lib/observability/telemetry.ts` is the provider-neutral local
telemetry boundary. It records only an allow-listed path (`api`, `db`, or
`job`), a safe operation name, a correlation ID, outcome, duration, and the
contract version. It delegates serialization and redaction to the existing
safe logger. It never accepts request bodies, user identifiers, listing IDs,
provider responses, credentials, or arbitrary error text.

Incoming `x-request-id` values are accepted only when they match the safe
identifier contract; otherwise the server generates an opaque UUID-based
correlation ID. No telemetry vendor, network export, or production credential
is configured by this task.

## Critical-path coverage

| Path | Bound operation | Signal |
| --- | --- | --- |
| API | Admin listing moderation RPC request | API correlation ID, outcome, duration |
| DB | Canonical create-listing-draft RPC | opaque DB correlation ID, outcome, duration |
| Job | Resilient background-work dispatch | command correlation ID, completed/retryable/failure outcome, duration |

The existing error logger continues to redact sensitive context. Background
work preserves the supplied command correlation ID and still uses the durable
handler/store boundary for idempotency; telemetry does not change retries,
authorization, RLS, or RPC behavior.

## Local SLO readiness

The locally verifiable readiness signals are the structured per-operation
latency and outcome signals above, plus the already established JLC-1401
critical-response budgets. A production error-rate, availability, or percentile
alert SLO cannot be honestly measured without an explicitly approved telemetry
destination (O-014); this task deliberately does not select or activate one.

The contract tests verify PII-safe redaction compatibility, request-correlation
validation, latency/outcome fields, provider neutrality, and API/DB/job
coverage. They are a release-readiness gate, not evidence of production
monitoring or an external alerting service.
