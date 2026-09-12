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
4. `FUNCTIONAL-02C1` — public-safe denormalized listing search document and protected projection synchronized with approval, public vehicle facts, price, cover/media, approved video, seller type/public dealer data, and lifecycle states.
5. `FUNCTIONAL-02C2` — canonical versioned database search request, keyset pagination, complete filters/stable sorts, and public-safe response with no phone, VIN, or private seller identifiers.
6. `FUNCTIONAL-02D` — replace capped `getHomeListings(60)` browser filtering with server search, URL normalization, pagination, filters, and loading/error/empty UX.
7. `FUNCTIONAL-02E` — migrate Sell/Edit to vehicle and trust contracts.
8. `FUNCTIONAL-02F` — dealer-import foundation.

## Subsequent V1 stages

Derive narrow dependency-respecting stages from the product specification: seller-contact UI/rate limit/leads; lifecycle/edit completion; Galeri verification; Excel then required XML import; chat; notifications; video pipeline/feed/analytics; production Yolmod AI; saved-search completion; compare; similar ranking; price history; analytics; abuse controls; admin/moderation; SEO; i18n/mobile-web QA; legal surfaces; final UX; and security/privacy/performance launch audit.

No product stage may silently introduce external providers, production changes, payment/escrow, or unapproved trust claims.
