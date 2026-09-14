# Yolmod V1 implementation roadmap

**Status:** Authoritative execution order. Every stage remains small enough to implement, test, review, and commit independently.

## Complete

- `FUNCTIONAL-01` — full V1 repository audit
- `FUNCTIONAL-01B` — audit reconciliation
- `FUNCTIONAL-02A` — Turkey vehicle/trust/search contract design

## Current dependency sequence

1. `FUNCTIONAL-02B1` — **Core Turkey Vehicle Schema**: variant catalog, İlçe support using city structure, missing typed vehicle specifications, canonical power, EV/hybrid-compatible fields, and Takas. Additive/backward-compatible migration and focused tests only. Excludes body panels, provenance, VIN, search documents/server search, importer, and AI.
2. `FUNCTIONAL-02B2` — Turkey condition/trust declarations: panel states, damage/service declarations, field-level provenance/evidence, and trust-safe display semantics.
3. `FUNCTIONAL-02B3` — optional VIN foundation: normalization/validation, protected raw representation, duplicate/conflict handling, decoder extension point, no publication block.
4. `FUNCTIONAL-02C1A` — publication-path inventory and durable projection contract.
5. `FUNCTIONAL-02C1B` — public-safe search projection schema and internal refresh function.
6. `FUNCTIONAL-02C1C` — approved entry-path integration and fail-closed lifecycle invalidation.
7. `FUNCTIONAL-02C1D` — eligible backfill and privacy/runtime matrix; parent `FUNCTIONAL-02C1` completes here.
5. `FUNCTIONAL-02C2` — canonical versioned database search request, keyset pagination, complete filters/stable sorts, and public-safe response with no phone, VIN, or private seller identifiers.
6. `FUNCTIONAL-02D` — replace capped `getHomeListings(60)` browser filtering with server search, URL normalization, pagination, filters, and loading/error/empty UX.
7. `FUNCTIONAL-02E` — migrate Sell/Edit to vehicle and trust contracts.
8. `FUNCTIONAL-02F` — dealer-import foundation.
9. `FUNCTIONAL-02G` — **Galeri Verification Foundation**: establish the canonical distinction between individual and Galeri sellers through a durable Galeri verification state model covering pending, verified, and rejected outcomes; keep verification evidence metadata and document references private; make transitions database-enforced and available only to authorized platform review staff; write an auditable verification-transition history; and expose only a public-safe verified signal. The foundation must provide a server-side verified-Galeri prerequisite that `FUNCTIONAL-02H` can consume without trusting profile edits or client claims. It excludes import execution, XML, dealer employees/branches, reviews, payments/subscriptions, seller-contact work, lifecycle work, and a large public/admin UI redesign.
10. `FUNCTIONAL-02H` — **Excel Import Service Boundary**: after `FUNCTIONAL-02G` is complete and its verified-Galeri prerequisite is enforced, add the server-only Excel parsing and controlled create/update/archive application boundary over the private `FUNCTIONAL-02F` bookkeeping contract. It excludes XML import and all unrelated seller, lifecycle, and commercial features.
11. `FUNCTIONAL-02I` — **Seller Contact Completion**: complete the authenticated, eligibility-gated seller-contact flow over the existing private phone facade. It excludes WhatsApp, public phone exposure, and lifecycle/edit work.
12. `FUNCTIONAL-02J` — **Lifecycle/Edit Completion**: complete the approved listing lifecycle and edit work after seller-contact completion. It is not approved for implementation before `FUNCTIONAL-02I` completes.

### FUNCTIONAL-02G acceptance criteria

- A durable canonical Galeri verification record distinguishes a dealer seller type from the verification outcome and represents pending, verified, and rejected states.
- A Galeri may submit or view only its own private verification data. It cannot grant, restore, or fabricate verified status through direct table/API access, profile updates, or client-side state.
- Only the canonical platform review authority (admin/moderator under the existing RBAC model) can make verification-state transitions; every transition is database-enforced and auditable with actor and timestamp.
- Verification evidence metadata and document references are private, RLS-protected, and excluded from public profiles, listing/search projections, and public APIs. Anonymous users and unrelated authenticated users receive no private verification data.
- Public consumers receive at most a derived, public-safe verified signal. It is produced from the protected canonical verification state, never from a seller-controlled field; no status other than verified may create a badge or equivalent claim.
- The resulting internal predicate/contract is sufficient for `FUNCTIONAL-02H` to require a verified Galeri before a service may execute an import. It does not itself parse or apply Excel data.
- Targeted role-matrix and privilege tests cover anon, individual seller, Galeri owner, non-owner Galeri, authorized reviewer, and service role; migration and security lifecycle checks pass if a migration is introduced.

## Subsequent V1 stages

After `FUNCTIONAL-02H`, the approved sequence is `FUNCTIONAL-02I` seller-contact completion, then `FUNCTIONAL-02J` lifecycle/edit completion. Derive each later narrow dependency-respecting stage from the product specification: required XML import; chat; notifications; video pipeline/feed/analytics; production Yolmod AI; saved-search completion; compare; similar ranking; price history; analytics; abuse controls; admin/moderation; SEO; i18n/mobile-web QA; legal surfaces; final UX; and security/privacy/performance launch audit.

No product stage may silently introduce external providers, production changes, payment/escrow, or unapproved trust claims.
