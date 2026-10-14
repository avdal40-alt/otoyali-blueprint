# JLC-1406 — Search scaling boundary

**Status:** completed locally

PostgreSQL Search v1 remains Jolcar's authoritative search implementation and
source of truth. `SearchService` owns the stable public request/response
contract and the present PostgreSQL adapter. Web search, AI natural-language
search, and AI price-comparison candidate retrieval all use that adapter rather
than independently invoking the Search v1 RPC.

The boundary preserves Search v1's bounded requests, keyset cursor ordering,
`raised_at` ranking, true `published_at`, public image/video projection, and
database authorization. It creates no OpenSearch/Elasticsearch dependency,
secondary index, migration, provider integration, or new privilege path.

## Escalation threshold

Adopting another search implementation requires a separately reviewed,
representative measured workload showing that PostgreSQL Search v1 cannot meet
an agreed latency, throughput, or operational requirement after the existing
query/index and application-path remedies. The replacement must implement the
same `SearchService` contract, retain PostgreSQL as authoritative, preserve
lifecycle/privacy semantics, and receive its own migration/security/rollout
plan. This task does not authorize that adoption.

## Local verification

- `npm run test:jlc-1406`
- `npm run test:jlc-0404`
- `npm run test:jlc-1003`
- `npm run test:ai-01b`
- `npm run test:ai-01f-a`
- `npm run test:jlc-1204`
- `npm run typecheck`
