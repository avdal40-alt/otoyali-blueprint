# JOLCAR MASTER PLAN

**Version:** 1.0  
**Prepared:** 2026-10-10  
**Purpose:** source-of-truth plan for autonomous local development of Jolcar, using the reusable YOLMOD foundation while preserving a future multi-country platform.

> This document separates **CONFIRMED DECISIONS**, **APPROVED SCOPE**, **PROPOSALS**, and **OPEN QUESTIONS**. Codex must not silently turn a proposal or open question into a product decision.

## 1. Product mission

### Confirmed
- **Jolcar is the first Kazakhstan-facing automotive marketplace product.**
- Jolcar launches as its own country-facing brand/product while using reusable shared technology.
- The platform must remain compatible with **YOLMOD for Turkey** and future country products.
- Country brands may initially use independent domains, branding, catalogs/configuration, legal copy and launch schedules while sharing core marketplace technology.
- The marketplace business model is **lead generation / direct buyer-seller contact**.
- **Buyer-seller payments, escrow, in-platform vehicle reservation and “safe transaction” are explicitly out of scope.**
- **Seller/dealer star ratings and seller/dealer reviews are explicitly out of scope.**
- Reviews are about **vehicles/models/ownership experience**.

Jolcar should become a mobile-first automotive marketplace plus a dealer operating platform:

`Marketplace + trusted listings + chat + AI + vehicle knowledge + dealer social/live + lightweight dealer CRM`

## 2. Source basis and evidence policy

This plan is built from the available project history, user-approved decisions in the current conversation, and available YOLMOD audit/autopilot material.

Historical YOLMOD evidence indicates a substantial reusable foundation, including public browse/search/detail, listing lifecycle, moderation, favorites, saved searches, seller-contact security work, media/storage security, chat work, AI foundation work, test/autopilot tooling, and strict Git/database safety rules.

**Historical YOLMOD status is not proof that Jolcar already has those capabilities.** The first Jolcar task must re-audit the actual Git repository/worktree and tests. No task may be marked done from prose alone.

Known documentation gaps from a prior YOLMOD launch audit included, at that audit point:
- `ENGINEERING_PRINCIPLES`
- `VEHICLE_DOMAIN`
- `IMPLEMENTATION_PLAN`

The repository must be checked again.

### Evidence precedence
1. Current Git tree and committed migrations.
2. Passing automated/runtime tests.
3. Current repository documentation.
4. Historical audit outputs.
5. Conversation-derived plan.

If sources disagree, **Git + verified runtime behavior win**, but Codex must report the conflict instead of silently rewriting the product plan.

## 3. Confirmed technical baseline

Approved inherited direction:
- Next.js
- TypeScript
- Supabase: PostgreSQL, RLS, Storage, Auth
- PostGIS where geo queries require it
- Vercel as the existing web deployment target
- additive/forward-only migration discipline
- server/database authorization rather than client trust
- public/private API boundaries that do not expose private seller identity/contact data

### Autonomous restriction
The orchestrator may work **locally only** unless the user explicitly authorizes a specific remote action.

It must not:
- access or mutate production Supabase;
- apply remote migrations;
- deploy;
- push Git;
- create/change secrets;
- configure real paid SMS/AI/live providers;
- change DNS/domain configuration;
- perform buyer-seller payments/escrow.

## 4. Multi-country architecture

### Confirmed target
Jolcar must not become a Kazakhstan-only fork with country assumptions embedded throughout business logic.

Separate **shared domain/core** from **country/brand configuration**.

### Shared core
Keep these country-agnostic wherever practical:
- auth/session framework;
- users/profiles;
- seller/dealer roles;
- listing lifecycle;
- moderation lifecycle;
- media ownership;
- favorites;
- saved searches;
- buyer requests;
- matching;
- notifications;
- messaging;
- seller-contact abstraction;
- dealer CRM;
- dealer social;
- live metadata;
- vehicle reviews;
- analytics events;
- AI tool authorization;
- security/RLS/audit patterns;
- API contracts.

### Country/brand layer
Own, where relevant:
- product/brand name;
- host/domain;
- locale set;
- currency;
- number/date formatting;
- country code;
- phone policy;
- location/city datasets;
- vehicle catalog differences;
- regulatory integrations;
- seller/dealer verification requirements;
- legal/support copy;
- SEO metadata;
- local provider configuration.

**Hard rule:** do not solve Jolcar by renaming Turkish constants while leaving Turkey-specific assumptions in core logic.

## 5. Authentication and seller contacts

### Confirmed target auth
- First registration: phone → one OTP → phone confirmed → mandatory password creation.
- Routine login: phone + password, **zero SMS**.
- OTP only for registration, password recovery/reset, phone change/new contact verification and genuinely sensitive actions.
- No automatic resend.
- Already verified seller contacts are reusable.

### Seller contacts
Inherited approved direction:
- up to **3 active reusable verified seller contact numbers** per seller;
- each listing explicitly selects a verified seller contact;
- changing a listing contact is an explicit owner action;
- buyer protected-contact returns only the selected contact;
- public browse/search/detail expose no private phone, seller auth UUID, contact IDs, contact list or verification metadata.

For Jolcar this must become country-aware rather than hardcoded to Turkey.

**Open:** exact Kazakhstan seller-phone policy and SMS provider.

## 6. Marketplace launch scope

Unless explicitly marked bonus/future, these are pre-public-launch scope.

### Core marketplace
- guest-first public browsing;
- search/filter/sort/pagination;
- public listing detail;
- listing publish flow;
- drafts;
- edit/resubmit;
- moderation;
- seller “my listings” management;
- favorites;
- saved searches;
- protected seller contact;
- zero-km vs second-hand;
- seller/dealer public profiles;
- automotive news feed.

### Listing transparency and cards
Required:
- publication date;
- view count;
- consistent image aspect ratio;
- stable grid;
- mobile-first card behavior.

Allowed ratio requirement: one consistent ratio chosen from **4:3 or 3:2**.

**Open:** final choice if current implementation is not already consistently one of those.

### Search UX
Required quick start:

`Make → Model → Price → All filters`

Also:
- live result count on CTA, e.g. `Show 1,284 cars`;
- advanced filters;
- mobile-friendly filter interaction.

### Saved searches and alerts
Required:
- saved search management;
- matching-new-listing notifications;
- price-drop alerts;
- unified notification-center architecture.

### Seller analytics
Required where reliably measurable:
- listing views;
- protected contact / call-intent events;
- favorites;
- messages/leads;
- useful funnel summaries.

Required UI concept: **Raise to top**.

**Open:** exact entitlement/frequency/ranking/duration/business rule. No payment flow may be invented.

## 7. Listing creation and media

### Required seller UX
- final user action is **Publish listing**;
- Save draft is separate;
- publish enters moderation internally;
- meaningful unsaved changes on leave → save draft & exit / exit without saving / stay;
- no warning if nothing meaningful changed.

### Media
Required:
- secure photo upload;
- cover/order;
- safe public derivatives;
- storage authorization;
- photo deletion and orphan cleanup;
- listing video;
- media moderation where applicable;
- mobile camera/upload-friendly UX.

No production media smoke without explicit authorization.

## 8. Messaging

Buyer ↔ seller chat is mandatory before public launch.

Required:
- conversation create/reuse;
- inbox;
- send/reply;
- unread state;
- reliable refresh/realtime;
- owner/non-owner authorization;
- blocking/reporting;
- abuse/rate controls;
- notification integration;
- no privacy leakage.

A visible message CTA may not remain a dead end.

## 9. AI capabilities

Approved:
- natural-language vehicle search;
- comparison of vehicles/listings;
- listing description assistance;
- voice/text assisted listing creation:
  - AI asks missing questions;
  - fills form;
  - user reviews/approves before publication.

AI must not get arbitrary database, Supabase, SQL, RPC or private-contact access.

Preferred safe pattern:

`actor → secure AI runtime → allow-listed typed tool → canonical server/DB contract → minimal validated result`

Historical YOLMOD AI work supports actor derivation, redaction, structured validation, tool allow-list and rate/cost controls as necessary safeguards.

**Approved launch policy:** OpenAI is the initial external AI provider behind the existing server-side provider-neutral adapter; credentials are server-only and browser-to-provider calls are prohibited. `gpt-6-luna` is the default model. `gpt-6.1-sol` requires an explicit feature flag or task-level routing policy with measured quality justification and is not an automatic fallback. Default use is standard service tier, approximately 8,000 input tokens, 1,000 output tokens, a 15-second timeout, and at most one transient-only retry within an approximately 25-second attempt window. Server-side accounting warns at USD 25 and USD 40 and stops calls at USD 50/month. Provider/model policy is not provider activation: secrets, paid calls, billing, staging/production integration, and deployment remain separately authorized.

**Approved launch voice policy:** browser/native speech-to-text is progressive enhancement only; text input remains mandatory and universal. Jolcar does not persist raw voice recordings or require raw-audio upload, and its AI orchestration receives text. Unsupported platforms, permission denial, and recognition errors fall back to text. Keep a provider-neutral speech boundary for future native clients; no external speech provider is approved for MVP.

## 10. Buyer Requests and matching

Approved:
- Buyer Requests / “I want to buy a car”;
- private buyer identity by default;
- sellers/dealers respond with active Jolcar listings;
- matching new listings ↔ buyer requests;
- matching new listings ↔ saved searches;
- price changes ↔ relevant watchers;
- matching creates alerts/leads, not transactions.

## 11. Trust, VIN and anti-fraud

Confirmed:
- VIN remains optional unless a later country rule requires otherwise;
- architecture supports VIN trust/verification;
- practical launch anti-fraud covers duplicates, suspicious bulk behavior, obvious spam/scam, suspiciously low-price signals, repeated media where reasonably detectable, report/admin review.

**Open:** Kazakhstan VIN/history/registry provider or official source.

## 12. Vehicle owner reviews

Do **not** build seller/dealer reviews.

Build ownership reviews:

`Brand → Model → Generation → optional modification → Owner Review`

Approved concepts:
- model/generation;
- model year;
- optional engine/modification;
- ownership duration;
- mileage during ownership;
- overall rating;
- category ratings such as reliability, comfort, handling, dynamics, cost;
- pros;
- cons;
- ownership text;
- optional photos;
- usage profile where supported;
- “Would buy again?”;
- “Recommend this car?”;
- moderation/reporting.

Review/model pages link to current listings; listings link to relevant reviews.

## 13. Dealer platform

### Dealer identity/profile
Dealer uses the same account identity foundation, not a second auth system.

Public dealer profile supports:
- logo/avatar;
- cover;
- name;
- description;
- location;
- verified dealer signal;
- stock;
- follow;
- Posts / Cars / Videos / Live.

**Open:** exact Kazakhstan dealer verification requirements.

### Dealer Social
Approved:
- social-style dealer profile;
- posts;
- photo/video;
- attach real Jolcar listings;
- followers/follow;
- moderation/reporting.

### Dealer Live
Mandatory pre-launch v1:
- only permitted/verified dealers can start live;
- viewer page;
- attached listings;
- comments/basic reactions where implemented;
- follow/message entry points;
- report/moderation;
- admin stop/block;
- ended/recorded state where provider supports it;
- live notifications;
- responsive web.

**Architecture rule:** do not build raw live transport on Supabase/Vercel. Use a specialized streaming provider behind an adapter.

**Open:** exact provider.

### Dealer bulk inventory
Required:
- feed integration;
- API integration;
- validation;
- reconciliation/upsert rules;
- duplicate protection;
- clear import errors.

**Open:** exact launch feed formats and API authentication.

### Lightweight Dealer CRM
Mandatory.

Core model:

`Dealer → staff/manager → lead → vehicle/listing → source → status → next action → result`

Lead sources: listing, chat, protected contact, dealer post, live, Buyer Request.

Approved v1:
- staff/managers;
- lead assignment;
- statuses;
- notes;
- reminders/follow-up;
- activity history;
- listing/vehicle link;
- source attribution;
- filters;
- simple funnel;
- basic analytics.

Conceptual statuses:
`New → Contacted → Thinking → Meeting → Sold → Lost`

Do not add accounting, payroll, full ERP, full telephony or document management.

### Dealer analytics
Required:
- views;
- contacts;
- messages;
- leads;
- meetings/sold where CRM records them;
- source attribution;
- post/live funnel;
- staff/funnel summary.

## 14. Design and UX rules

Confirmed:
- restrained palette;
- neutral base + one brand accent;
- no more than 2–3 dominant UI colors;
- short, smooth, functional microanimations;
- mobile-first;
- thumb-friendly controls;
- future native app should use bottom navigation;
- accessibility:
  - normal body text target from 16px;
  - tap target target at least 44×44px;
  - sufficient contrast;
  - understandable labels/focus/errors.

Dark mode is a desirable bonus, **not a launch blocker**.

Open:
- final accent;
- final card ratio if unresolved;
- final Jolcar brand kit.

## 15. Zero-km, inventory and news

Approved:
- zero-km vs second-hand experience;
- dealer inventory representation;
- availability/trim/price where data exists;
- dealer offers/promotions only after business rules are approved;
- automotive news feed.

Do not invent content licensing/scraping rules.

## 16. Security, privacy and abuse controls

Mandatory:
- server/database authorization;
- RLS for private tables;
- least privilege;
- public facades contain only public fields;
- no public seller auth UUID/private phone/contact IDs/contact list/verification metadata;
- protected contact reveals only selected allowed number;
- rate-limit sensitive disclosure and messaging;
- audit admin/moderation decisions;
- anon/auth/owner/non-owner/admin security matrices;
- no service-role secret in browser;
- no committed tokens;
- no auth bypasses for tests;
- test helpers are local/test-only.

## 17. Database and migration rules

- additive/forward-only where possible;
- never reset valuable/production DB;
- never edit applied migration history;
- no destructive migration without approval;
- inspect schema/RLS/constraints before migration;
- validate privileges/RLS/backward compatibility;
- no remote migration apply during autonomous local work.

## 18. Git and autonomous execution

- one logical task per Codex run;
- one logical commit per successful mutation task;
- no push;
- no force-push/rebase/squash/amend unless explicitly authorized;
- clean worktree before next task;
- no false PASS;
- no dependent task after failed prerequisite;
- temporary config/credential artifacts restored before completion.

See `AGENTS.md`.

## 19. Launch gates

Jolcar is not public-launch ready until applicable mandatory modules pass:

1. Multi-country/country configuration foundation.
2. Auth/password/OTP and reusable seller contacts.
3. Public browse/search/detail.
4. Quick search + live count + advanced filters.
5. Listing drafts/publish/moderation.
6. Photo/video media + cleanup.
7. Seller contact + abuse controls.
8. Favorites/saved searches/new-listing & price-drop alerts.
9. Buyer-seller chat.
10. Buyer Requests + matching.
11. Vehicle owner reviews.
12. VIN/trust foundation + launch anti-fraud.
13. Dealer profile/social.
14. Dealer bulk import/feed/API.
15. Dealer Live.
16. Dealer CRM v1 + analytics.
17. AI search/compare/description + assisted listing.
18. Zero-km flow.
19. News feed.
20. Mobile-first/responsive/accessibility QA.
21. Security/privacy/RLS regression.
22. Existing SEO/performance/operational readiness foundations.
23. **Performance Hardening:** measurable critical-flow budgets, database/query/index audit, media delivery, frontend bundle/render/cache work, background-work boundaries, search scaling boundary, and a mandatory regression gate.
24. **Production Engineering Hardening:** domain/API boundaries, mobile API readiness, security, resilience, observability/SLOs, backup/restore, staging/release pipeline, and post-hardening E2E/security/performance regression.
25. Final local launch-readiness package, after both hardening-phase reports/gates pass.
26. Separately authorized production/provider/domain/deploy steps.

### Hardening principles

- Do not introduce microservices, NestJS, Redis, OpenSearch, Kafka, Kubernetes, or a full AWS migration merely to appear enterprise-ready.
- PostgreSQL remains the current source of truth and Next.js/TypeScript remain the valid current web stack.
- Add infrastructure only when architecture or measured load justifies it; retain provider-neutral boundaries where a future provider may be needed.
- Optimization must be measurable: baseline → change → re-measure. A critical regression fails its release gate; it cannot be recorded as PASS.
- Performance work must not weaken security, RLS, accessibility, SEO, or correctness.
- All hardening work remains local until a separately authorized production action. No new task authorizes production infrastructure, provider activation, secrets, DNS, deployment, or remote database access.

## 20. Explicit exclusions

Do not build without a new user decision:
- buyer-seller payments;
- escrow;
- in-platform vehicle reservation transaction;
- safe-deal settlement;
- seller/dealer star ratings;
- seller/dealer reviews;
- dealer accounting;
- payroll;
- full ERP;
- full telephony platform.

## 21. Approved future scope not required to block first public web launch unless reclassified

- native iOS app;
- native Android app;
- native mobile live broadcasting;
- additional vehicle verticals;
- parts/services/insurance;
- RENT;
- deeper personalization beyond approved matching;
- dark mode if not completed pre-launch.

Future mobile clients must reuse the same backend/domain contracts.

## 22. Proposals, not final decisions

- React Native + Expo for future mobile apps;
- 4:3 as preferred card ratio;
- a specific live provider such as Mux/AWS IVS/Cloudflare-class service;
- a particular analytics vendor;
- a particular SMS vendor;
- a particular Kazakhstan VIN/history provider;
- Dealer Free/Pro/Live commercial packaging.

## 23. Open questions

1. Exact Kazakhstan launch locales.
2. Final Jolcar domain/host and brand kit.
3. Final accent color.
4. 4:3 vs 3:2 if current UI is not already compliant.
5. Kazakhstan phone policy and production SMS provider.
6. Approved Kazakhstan city/location source if repo lacks one.
7. Dealer verification requirements/documents.
8. Dealer feed formats/API authentication.
9. Raise-to-top rule.
10. Live provider.
11. VIN/history data source.
12. Production analytics/telemetry provider.
13. Final legal/privacy/terms/support content.
14. Timing/scope of native iOS/Android relative to web launch.
15. Approved/licensed automotive news content source/editorial approach.

Tasks depending on these remain blocked rather than guessed.

## 24. Definition of done for any task

A task is not done because code exists.

Minimum evidence:
- intended Git diff reviewed;
- no unrelated changes;
- requested behavior implemented;
- targeted tests pass;
- relevant type/static check passes;
- security/privacy checks run when relevant;
- migration review run when relevant;
- worktree clean after commit;
- commit SHA recorded for mutation tasks;
- no production/deploy/secrets action without authorization;
- unverified items explicitly reported.
