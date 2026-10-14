# JLC-1405 — Background-work and event boundary

**Status:** completed locally
**Scope:** provider-neutral contract and request-path inventory; no broker or worker is introduced.

## Boundary

The authoritative state transition must complete before any deferred work is
considered. A request must not report success until its canonical database/RPC
write, authorization, RLS/privilege enforcement, lifecycle trigger, and
required synchronous validation have completed. Existing matching, notification
creation, analytics source events, lifecycle triggers, and public Search v1
semantics remain synchronous and unchanged.

`BackgroundWorkCommand` in
`apps/web/src/lib/background-work/contracts.ts` is the only proposed hand-off
shape. It has a version, work kind, opaque subject reference, trusted actor
reference, correlation ID, idempotency key, payload, and occurrence time. It is
not an API/client payload: commands are created only by trusted server-side
code after it has authorized the source action. The contract deliberately does
not include phone numbers, emails, credentials, private seller contact data, or
arbitrary user input.

Any future dispatcher must preserve the command, deduplicate effects by
`idempotencyKey`, return a typed completed/retryable/permanent result, emit safe
structured observability using `correlationId`, and re-check authorization at
the canonical handler/RPC boundary. A retried command must never create a
second notification, lead, media derivative, analytics fact, or index effect.

## Blocking-path inventory and deferral criteria

| Work area | Authoritative/request-critical work | Candidate deferred follow-up | Deferral rule |
| --- | --- | --- | --- |
| Image processing | Validate upload ownership and media references | Derivative generation, optimization, scanning/reprocessing | Never publish a derivative as available before its metadata is committed; preserve storage authorization. |
| Notifications | Canonical matching, deduplicated notification/lead creation, owner-only reads | Delivery to a future external channel | A delivery failure cannot undo or duplicate the in-app event. |
| Analytics | Trusted source-event ingestion | Aggregation, export, dashboards, external telemetry | Metrics are derived from source facts; no caller-controlled event fabrication. |
| Saved-search matching | Current canonical Search v1 match and deduplicated event creation | Measured batch/reconciliation work | Preserve cursor/order semantics and country/catalog boundaries; do not defer a required user-visible result without an explicit product change. |
| Dealer imports | Validate/authorize import submission and reconciliation intent | Fetch, parse, normalize, retry, report generation | No remote fetch/paid provider call from a user request; retain source/audit references. |
| AI | Actor derivation, allow-listing, redaction, validation, rate/cost checks | Provider execution that is not needed for the immediate response | AI never receives arbitrary database/RPC/private-contact access; no provider is selected here. |
| Search indexing | Canonical listing state and Search v1 write path | Secondary index/rebuild work if measured need exists | PostgreSQL remains the source of truth; stale secondary output must not bypass lifecycle/privacy rules. |

Deferral is appropriate only when the follow-up is slow, retryable, independent
of the immediate HTTP response, and can be made idempotent. It is not
appropriate for authorization, input validation, canonical state writes,
required transactionality, security logging, RLS/RPC enforcement, or any
result the request must truthfully return immediately.

## Failure modes and rollout

- A dispatcher outage leaves the canonical write intact; a future durable
  hand-off mechanism must make the outstanding command observable and safely
  retryable.
- A malformed command is rejected before dispatch. Permanent failures require
  a safe reason code and operational review; retryable failures specify a
  bounded delay.
- Provider adapters remain behind `BackgroundWorkDispatcher`. Kafka, SQS,
  Redis, cron, or an additional broker are explicitly not introduced by this
  task. Adoption requires measured pressure, operational ownership, and a
  separately reviewed durable-outbox/worker design.
- No database migration is needed: this task changes neither current database
  behavior nor permissions.

## Current validation

The contract test checks the work-kind inventory, idempotency/correlation and
authorization fields, opaque subject boundary, typed results, unsafe identifier
rejection, and the absence of broker dependencies. The existing safe logger is
the observability boundary for a later dispatcher binding.
