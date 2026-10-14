# JLC-1504 — Reliability and resilience hardening

**Status:** completed locally

## Failure boundaries

External delivery is isolated behind the provider-neutral background-work
dispatcher. A provider can only receive a validated command after the
authoritative database/RPC action has completed; it cannot undo, alter, or
make an unrelated listing, search, authentication, chat, or public browse
flow unavailable. No provider is enabled or called by this task.

Each dispatch attempt receives an abort signal and has a bounded timeout. A
timeout, thrown transport failure, or explicit `retryable_failure` is reported
as a typed retryable outcome. A permanent failure stops immediately. Callers
can preserve canonical in-app state and surface a safe degraded state without
exposing provider errors, payloads, or credentials.

## Retry and idempotency policy

`dispatchBackgroundWorkWithResilience` uses policy version `jlc-1504-v1`:
at most three attempts, five seconds per attempt, and deterministic 250 ms,
500 ms backoff (capped at two seconds). The dispatcher receives the same
immutable `BackgroundWorkCommand`, and therefore the same idempotency key, on
every retry. A dispatcher result with a different key is rejected as a
permanent contract failure.

This controller intentionally does not claim exactly-once delivery or use
process memory for deduplication. Any future effecting adapter must enforce
idempotency durably at its canonical handler/store boundary before producing a
notification, lead, derivative, analytics fact, import effect, or index
effect. Read-only provider work may be retried only when the provider client
has an explicit bounded retry policy.

## Current provider isolation

The optional AI provider remains disabled unless its existing local-only
configuration and distributed-rate-limit gates are satisfied. Its existing
request timeout and bounded SDK retry settings remain unchanged. AI
assistant/moderation paths already return safe unavailable/invalid outcomes;
the media privacy pipeline continues to fail closed rather than publishing an
unblurred image. No provider activation, paid call, migration, RLS/privilege
change, production access, deployment, or Git push occurred.

## Local verification

`npm run test:jlc-1504` performs failure injection for retryable failure,
permanent failure, provider-result idempotency mismatch, and timeout/abort. It
also proves exponential backoff and identical idempotency keys across retries.
`npm run typecheck`, `npm run test:jlc-1405`, and `npm run test:jlc-1205`
cover the affected TypeScript, hand-off, and safe-observability boundaries.
