# JOLCAR / YOLMOD DECISIONS LOG

**Version:** 1.0
**Prepared:** 2026-10-10

Status values:
- **CONFIRMED** — user-approved decision; do not change autonomously.
- **REVOKED** — previously considered, now explicitly removed.
- **PROPOSAL** — discussed/recommended but not final.
- **OPEN** — user decision or approved external source still required.

## Confirmed decisions

| ID | Status | Area | Decision | Consequence |
|---|---|---|---|---|
| D-001 | CONFIRMED | Product strategy | Jolcar is the first Kazakhstan-facing automotive marketplace product. | Kazakhstan is first launch country/product. |
| D-002 | CONFIRMED | International | Jolcar uses reusable shared technology so YOLMOD Turkey and future countries can later share one platform. | Avoid country-hardcoded core; use country/brand configuration. |
| D-003 | CONFIRMED | Branding strategy | Country products may initially operate as independent brands/products and later be unified. | Do not force one global public brand now. |
| D-004 | CONFIRMED | Tech baseline | Continue YOLMOD direction: Next.js + TypeScript + Supabase/Postgres/RLS/Storage + PostGIS + Vercel. | Reuse proven architecture unless user approves a change. |
| D-005 | CONFIRMED | UX | Guest-first browsing; authentication is required for protected actions. | Public read facades remain privacy-safe. |
| D-006 | CONFIRMED | Auth | First registration uses phone OTP once, then mandatory password creation. | Registration ends in password enrollment. |
| D-007 | CONFIRMED | Auth | Routine future login uses phone + password, without SMS. | Do not reintroduce OTP-only routine login. |
| D-008 | CONFIRMED | OTP | OTP is for registration, recovery/reset, phone changes/new contact verification and truly sensitive actions. | Minimize paid SMS; no automatic re-verification. |
| D-009 | CONFIRMED | Seller contacts | Up to three active reusable verified seller contact numbers per seller. | Listing chooses a verified contact; reuse sends 0 OTP. |
| D-010 | CONFIRMED | Seller contacts | Reusing/selecting a verified contact during listing create/edit must not trigger OTP. | Contact is a reusable trust object. |
| D-011 | CONFIRMED | Listing UX | Final seller action is “Publish listing”; “Save draft” is separate. | Technical moderation language is not primary UX. |
| D-012 | CONFIRMED | Listing UX | Leaving with meaningful unsaved listing changes offers save draft & exit / exit without saving / stay. | No warning if nothing changed. |
| D-013 | CONFIRMED | Chat | Buyer-seller chat is mandatory before public launch. | Visible message CTA may not remain dead. |
| D-014 | CONFIRMED | Dealer | Dealer Social is mandatory before public launch. | Dealer profile includes social-style content and listing-linked posts. |
| D-015 | CONFIRMED | Dealer | Verified/authorized dealers must be able to run live streams. | Dealer Live is launch scope. |
| D-016 | CONFIRMED | Live architecture | Do not build raw live-video transport on Supabase/Vercel; use a specialized provider behind app contracts. | Exact provider remains open. |
| D-017 | CONFIRMED | Dealer CRM | Lightweight Dealer CRM v1 is mandatory before public launch. | Leads, staff, statuses, notes, follow-up, history, funnel/analytics. |
| D-018 | CONFIRMED | Dealer CRM | CRM stays lightweight and automotive; no accounting/payroll/full ERP/full telephony. | Hard scope guard. |
| D-019 | CONFIRMED | Reviews | Do not build seller/dealer ratings or seller/dealer reviews. | Dealer trust uses verification/activity signals. |
| D-020 | CONFIRMED | Reviews | Build owner reviews about vehicles/models/generations instead. | Vehicle review domain is launch scope. |
| D-021 | CONFIRMED | Payments | No buyer-seller payments, escrow, in-platform vehicle reservation transaction or “safe transaction” settlement. | Marketplace remains lead-generation/direct-contact. |
| D-022 | CONFIRMED | AI | AI search, AI vehicle/listing comparison and listing description assistance are approved. | Secure tool-gated AI runtime needed. |
| D-023 | CONFIRMED | AI listing | AI/voice-assisted listing creation is approved: ask missing questions, fill form, user confirms. | Voice/text listing assistant is launch scope. |
| D-024 | CONFIRMED | Buyer requests | Buyer Requests / “I want to buy a car” are approved. | Buyer specifies desired vehicle; sellers respond with active listings. |
| D-025 | CONFIRMED | Matching | Automatic matching between new listings, buyer requests and saved searches is approved. | Matching produces alerts/leads, not transactions. |
| D-026 | CONFIRMED | Notifications | Saved-search new-listing notifications and price-drop alerts are required. | Build unified event/notification layer. |
| D-027 | CONFIRMED | Listing transparency | Show listing publication date and number of views. | Listing/card/detail contracts need those public fields where appropriate. |
| D-028 | CONFIRMED | Card/grid | Listing cards use one consistent image ratio chosen from 4:3 or 3:2 and a stable grid. | Exact choice remains open if current UI is not already compliant. |
| D-029 | CONFIRMED | Search UX | Quick search starts Make → Model → Price; advanced criteria go under “All filters”. | Mobile-first search is simple. |
| D-030 | CONFIRMED | Search UX | Filter CTA shows a live result count such as “Show 1,284 cars”. | Count comes from canonical search. |
| D-031 | CONFIRMED | Seller analytics | Seller cabinet shows views, contact/call intent, favorites and useful listing analytics. | Event model required. |
| D-032 | CONFIRMED | Promotion | Seller UI includes “Raise to top”. | Exact ranking/entitlement rule remains open; no payments invented. |
| D-033 | CONFIRMED | Dealer import | Dealers require mass inventory upload via feed and API. | Build ingestion/reconciliation/validation. |
| D-034 | CONFIRMED | Design | Restrained palette: neutral base + one accent; no more than 2–3 dominant UI colors. | Design tokens should enforce discipline. |
| D-035 | CONFIRMED | Motion | Microanimations are short, smooth and functional. | No effects for effects’ sake. |
| D-036 | CONFIRMED | Mobile | Product is mobile-first and controls are thumb-friendly. | Mobile web is launch-quality surface. |
| D-037 | CONFIRMED | Accessibility | Body text target from 16px; tap targets target >=44×44px; contrast/focus/labels matter. | Accessibility is part of QA. |
| D-038 | CONFIRMED | Dark mode | Dark theme is desirable bonus, not a launch blocker. | Tokens should keep future theme possible. |
| D-039 | CONFIRMED | VIN | VIN may remain optional unless country rule later requires it; architecture supports VIN trust/history. | External KZ data source remains open. |
| D-040 | CONFIRMED | Zero-km | Product distinguishes zero-km/new vehicles from second-hand and supports dealer inventory. | Preserve this in catalog/search/listing UX. |
| D-041 | CONFIRMED | News | Automotive news feed remains in product plan. | Do not lose earlier YOLMOD news scope. |
| D-042 | CONFIRMED | Security | Authorization is server/database enforced; RLS/privacy cannot be weakened for convenience. | Mandatory security matrices. |
| D-043 | CONFIRMED | DB | Database evolution is additive/forward-only; do not edit applied migrations or destructively reset valuable/production data. | Migration safety is non-negotiable. |
| D-044 | CONFIRMED | Autonomy | Autonomous development may not access production Supabase, secrets, paid providers, deployment, DNS or remote migrations without separate permission. | Local-only overnight execution. |
| D-045 | CONFIRMED | Verification | Task completion requires Git/test evidence. | Historical prose is not completion evidence. |
| D-046 | CONFIRMED | Scope control | Do not invent unapproved functions or change approved architecture without consent. | Open questions stay blocked, not guessed. |
| D-047 | CONFIRMED | Canonical vehicle catalog | Jolcar owns and operates the canonical vehicle catalog: Brand → Model → Generation → Configuration/Modification → Specs. Production runtime has no external catalog API dependency; external licensed/open data may only bootstrap, verify, or controlled-update normalized Jolcar data with identifiable provenance/version. | Stable internal IDs remain the product contract. Catalog imports are server-authorized, deterministic/idempotent by source dataset/version and source keys, and country overrides stay separate from the shared catalog. No generation/modification/specification data may be invented; population requires an approved authoritative dataset/import package. |
| D-048 | CONFIRMED | Catalog bootstrap source | Wikidata structured data under CC0-1.0 is approved as the initial controlled bootstrap source for Jolcar's canonical vehicle catalog. | It is read only during offline/local import preparation, with exact requests and a compact versioned snapshot retained. It is never a production runtime dependency; uncertain relationships are rejected rather than guessed. |
| D-049 | CONFIRMED | Pre-launch engineering hardening | Before final local launch readiness, Jolcar must complete distinct Performance Hardening and Production Engineering Hardening phases with measurable gates. | PostgreSQL remains the current source of truth and the Next.js/TypeScript web stack remains valid. Do not add microservices, NestJS, Redis, OpenSearch, Kafka, Kubernetes, or a full AWS migration solely for appearance; add infrastructure only when architecture or measured load justifies it. Optimization is baseline → change → re-measure and may not weaken security, RLS, accessibility, SEO, or correctness. Production remains untouched without explicit authorization. |
| D-050 | CONFIRMED | AI provider/model/cost | OpenAI is the initial production AI provider, behind the existing server-side provider-neutral AI adapter. The default model is `gpt-6-luna`; `gpt-6.1-sol` requires an explicit feature flag or task-level routing policy and measured quality justification. | Credentials remain server-only; no browser-to-provider call. Standard service tier is default. Target limits are 8,000 input and 1,000 output tokens, 15-second timeout, and at most one transient-only retry within an approximately 25-second attempt window. Server-side cost controls warn at USD 25 and USD 40 and hard-stop provider calls at USD 50/month. Policy only: activation, billing, secrets, paid calls, and deployment remain separately authorized. |
| D-051 | CONFIRMED | Voice/speech launch approach | MVP uses browser/native speech-to-text only as progressive enhancement; text input is mandatory and is the universal fallback. Jolcar does not add a separate paid/external speech provider or persist/upload raw voice audio for this launch flow. | Unsupported devices, denied permission, recognition errors, and platform unavailability fall back to text without failing a core workflow. The AI orchestration boundary receives text, and future native speech remains provider-neutral. No external speech vendor, secret, billing, or paid call is authorized. |

## Revoked / removed directions

| ID | Status | Area | Previous idea | Current rule |
|---|---|---|---|---|
| R-001 | REVOKED | Transactions | Payments / escrow / safe transaction / vehicle reservation payment. | Do not build. |
| R-002 | REVOKED | Reviews | Seller/dealer rating and review system. | Replaced by vehicle owner reviews. |

## Proposals, not final decisions

| ID | Status | Area | Proposal | Rule |
|---|---|---|---|---|
| P-001 | PROPOSAL | Mobile apps | Use React Native + Expo + TypeScript for future iOS/Android. | Do not adopt without confirmation. |
| P-002 | PROPOSAL | Card design | Prefer 4:3 listing image ratio. | 4:3 or 3:2 are accepted options; final choice open. |
| P-003 | PROPOSAL | AI | Use a single server-only OpenAI provider adapter behind secure AI runtime. | Historical recommendation, superseded by confirmed D-050 and decided O-011; retained for traceability only. |
| P-004 | PROPOSAL | Live | Candidate providers include Mux, AWS IVS or Cloudflare-class services. | Exact provider open. |
| P-005 | PROPOSAL | Dealer monetization | Dealer Free/Pro/Live tiers and promoted live inventory. | Commercial packaging not approved. |
| P-006 | PROPOSAL | Vehicle reviews | Category scores such as reliability/comfort/handling/dynamics/cost. | Concept approved; exact scale may be refined. |

## Open decisions

| ID | Status | Area | Question | Blocking impact |
|---|---|---|---|---|
| O-001 | DECIDED | Localization | Kazakhstan launch locale set is **kk-KZ, ru-KZ, and en**. Do not add or remove locales beyond this approved set. | Explicitly approved by user 2026-10-13. |
| O-002 | DECIDED | Brand/domain | Kazakhstan brand is **Jolcar / Жолкар**, launched as a standalone country product on the shared multi-country architecture. Exact production domain/host is explicitly deferred to the DNS/release gate and must not block core development. | Approved by user 2026-10-10. |
| O-003 | DECIDED | Design | Accent color remains a configurable design token. Exact final accent value is explicitly deferred and must not block implementation or QA of core flows. | Approved by user 2026-10-10. |
| O-004 | DECIDED | Design | Final listing-card image ratio is **4:3**. | Approved by user 2026-10-10. |
| O-005 | DECIDED | Phone/SMS | Kazakhstan seller/account phone policy uses **+7**. First registration: OTP then mandatory password enrollment. Routine login: phone + password, no routine OTP. OTP remains for registration, recovery, phone change/additional verified contact, and genuinely sensitive actions. Production SMS vendor selection/activation is deferred to production rollout; keep provider abstraction. | Approved by user 2026-10-10. |
| O-006 | DECIDED | Geo | Use a repository-versioned Kazakhstan region/city dataset for development and MVP. Keep the geo boundary replaceable/syncable so an approved official source can be adopted later without rewriting product logic. | Approved by user 2026-10-10. |
| O-007 | DECIDED | Dealer verification | Kazakhstan dealer verification requires a Kazakhstan legal entity or registered individual entrepreneur, a verified business registration identifier (BIN/IIN as applicable), verified phone, dealer/trade name, city/location, and an authorized representative. Verification is granted by admin review. States: `pending / verified / rejected / suspended`. Identity-document scans are not required by default unless a later legal/anti-fraud rule explicitly requires them. | Approved by user 2026-10-10. |
| O-008 | DECIDED | Dealer feed/API | Launch dealer inventory ingestion accepts XLSX, UTF-8 CSV, and HTTPS JSON API. API authentication uses Bearer tokens and is available only to verified dealers. Tokens must be stored/handled securely: hashed where applicable, scoped, rate-limited, and revocable; dealer ownership boundaries remain enforced. Do not activate a real external dealer integration. | Explicitly approved by user 2026-10-13. |
| O-009 | DECIDED | Promotion | “Raise to top” uses a separate `raised_at` signal and never rewrites the true publication date. On MVP, each active listing gets one free raise every 7 days; after a raise it receives fresh placement in the standard ranking and then naturally moves down as newer/raised listings appear. Architecture may support future dealer entitlements/credits, but no payment flow is introduced. | Approved by user 2026-10-10. |
| O-010 | DECIDED | Live | Amazon IVS is the initial approved Dealer Live provider behind a replaceable provider abstraction. Local contracts/adapter work is authorized; production account activation, credentials, paid usage, and live provider calls remain separately guarded. | Approved by user 2026-10-10. |
| O-011 | DECIDED | AI | OpenAI is the approved initial provider behind the existing server-side provider-neutral adapter. `gpt-6-luna` is the default; `gpt-6.1-sol` may only be enabled through an explicit feature flag or task-level routing policy justified by measured quality. Standard service tier; target maximums: 8,000 input tokens, 1,000 generated output tokens, 15-second provider timeout, at most one retry for transient 429/appropriate 5xx failures, and approximately 25 seconds total attempt window. Server-side cost accounting warns at USD 25 and USD 40 and stops external calls at USD 50/month; telemetry must avoid unnecessary PII, provider secrets, and private user content. Model identifiers remain configuration, not scattered constants. | Explicitly approved by user 2026-10-15. This is policy only: no API key, secret, billing, paid call, provider activation, staging/production integration, or deployment is authorized. JLC-1007 and JLC-900* remain manual authorization boundaries. |
| O-012 | DECIDED | Voice | Launch uses browser/native speech-to-text as progressive enhancement only; text input is mandatory and universal. Jolcar does not persist raw voice recordings or require raw-audio upload, and must not claim all platform recognition is local. The AI boundary receives text; preserve a provider-neutral speech boundary for future native applications. | Explicitly approved by user 2026-10-15. Unsupported devices, denial, errors, or platform unavailability fall back to text. No external speech provider, key, billing, paid call, or production activation is authorized. |
| O-013 | DECIDED | VIN/trust | No external Kazakhstan VIN/history provider is required for the first public release. VIN remains optional; keep a replaceable provider boundary and normalization model. Do not claim verified vehicle history until an official/licensed source is separately approved and activated. | Approved by user 2026-10-10. |
| O-014 | OPEN | Analytics | Which production analytics/telemetry vendor is approved? | Blocks vendor-specific telemetry. |
| O-015 | OPEN | Legal/support | Final Kazakhstan legal/privacy/terms/support content and owner? | Blocks final production launch gate. |
| O-016 | OPEN | Native apps | Must native iOS/Android launch with first public web release or afterward? | Does not block web unless user reclassifies. |
| O-017 | DECIDED | News | Jolcar may use first-party editorial content and may later use properly licensed external content. **Unapproved scraping/copying of third-party copyrighted feeds is prohibited.** External provider/source integration is deferred until a specific licensed/approved source is chosen; the existing first-party editorial/news foundation may continue without an external provider. | Explicitly approved by user 2026-10-13. |

## Historical implementation note

Historical YOLMOD audits/commits indicate many reusable capabilities already exist or partially exist, including browse/search/detail, listing lifecycle, moderation, favorites, saved searches, media security, messaging work, seller-contact work and an AI foundation.

**No Jolcar task is complete from this evidence alone.** The Jolcar baseline audit must confirm current Git and tests before reuse.

<!-- JOLCAR_APPROVED_DECISIONS_2026-10-10 -->
## Approved Jolcar launch decisions — 2026-10-10

- **Locales:** kk-KZ, ru-KZ, en are all launch languages.
- **Brand:** Jolcar / Жолкар for Kazakhstan; standalone country launch on shared multi-country architecture.
- **Domain:** exact production host is deferred to the guarded DNS/release gate.
- **Design:** listing cards use 4:3; accent remains a configurable token and final accent lock is non-blocking.
- **Phone/Auth:** +7; first registration OTP -> mandatory password; routine login phone + password; OTP only for registration/recovery/phone-change/additional-contact/sensitive actions.
- **SMS:** provider abstraction remains; production vendor selection and activation are deferred to production rollout.
- **Geo:** repository-versioned Kazakhstan city/region data for MVP, behind a replaceable source boundary.
- **News:** original/editorial or explicitly licensed/permitted content only; no automated scraping; external ingestion deferred.

These decisions authorize local implementation and testing only. They do not authorize production deployment, external provider activation, DNS changes, remote migrations, real SMS, scraping, or paid provider calls.

<!-- JOLCAR_APPROVED_DECISIONS_2_2026-10-10 -->
## Approved Jolcar product/provider decisions — 2026-10-10 (batch 2)

- **Dealer verification (O-007 / JLC-D005):** Kazakhstan legal entity or registered individual entrepreneur; verified business registration identifier (BIN/IIN as applicable), verified phone, dealer/trade name, city/location and authorized representative; admin-controlled pending / verified / rejected / suspended; no identity-document scan by default unless later legally/anti-fraud required.
- **Raise to top (O-009 / JLC-D009):** keep true publication date immutable; use separate
aised_at; MVP grants one free raise every 7 days per active listing; future dealer entitlements/credits may plug in without introducing payments now.
- **Dealer Live (O-010 / JLC-D006):** Amazon IVS is the initial provider behind a replaceable provider abstraction. This approves local integration contracts only; production account activation, credentials, paid usage and live provider calls remain separately guarded.
- **VIN/history (O-013 / JLC-D010):** external Kazakhstan VIN/history source is deferred for first public release; VIN remains optional; provider boundary stays replaceable; no verified-history claims until an approved official/licensed source is activated.
- **Production SMS (JLC-0308):** remains deferred and requires separate explicit authorization.
- **AI foundation gap (JLC-1001):** remains a real implementation blocker; this decision package does not mark it complete.
- **Brand:** this batch does **not** rename Jolcar to JOLMOD. Branding remains unchanged until separately and explicitly approved.

These decisions authorize local implementation/testing only. They do not authorize production deployment, remote migrations, provider credentials, paid provider calls, real SMS, DNS changes, or Git push.

<!-- JOLCAR_APPROVED_D008_2026-10-10 -->
## Approved dealer feed/API launch decision — 2026-10-10

**O-008 / JLC-D008 — dealer inventory ingestion**

Launch formats:
- XLSX upload
- CSV UTF-8 upload
- HTTPS JSON API

API authentication/security:
- dealer-specific Bearer token
- verified dealers only
- token hashed at rest
- scope restricted to that dealer's inventory
- token revocable and rotatable
- rate-limited
- no administrative privileges

Deferred beyond launch:
- XML feed
- scheduled external feed pull
- OAuth/client-credentials integration

The architecture must keep feed/provider boundaries replaceable so deferred formats can be added without redesigning dealer inventory ownership.

This decision authorizes local implementation and testing only. It does not authorize production API exposure, production credentials, paid services, deployment, push, DNS changes, or remote migrations.

<!-- JOLCAR_APPROVED_AI_VOICE_POLICY_2026-10-15 -->
## Approved Jolcar AI and voice launch policy — 2026-10-15

**O-011 / JLC-D007 — external AI provider/model/cost policy (D-050)**

- OpenAI is the initial approved external provider, only behind the existing server-side provider-neutral AI adapter. Credentials are server-only; no client credential or direct browser-to-provider call is permitted.
- Default model: `gpt-6-luna`. `gpt-6.1-sol` is a future higher-capability option only behind an explicit feature flag or task-level routing policy with measured quality justification; it is not an uncontrolled fallback.
- Use the standard processing/service tier by default. Do not default to Fast, Ultrafast, priority-style, reserved, or premium service.
- Target maximum request bounds are approximately 8,000 input tokens and 1,000 generated output tokens; lower domain-specific limits are allowed. Any increase needs a future explicit engineering decision or measured justification.
- Provider timeout is 15 seconds; make at most one bounded retry only for transient HTTP 429 or appropriate 5xx/provider-transient failures. Do not retry deterministic client, authentication, or validation failures. Keep the total provider attempt window approximately 25 seconds or less, and degrade AI safely without impairing core marketplace functionality.
- The initial monthly ceiling is USD 50, with warnings at USD 25 and USD 40. Reaching USD 50 stops/disables further external provider calls rather than affecting core availability. Raising the ceiling needs later explicit approval.
- Usage/cost accounting is observable server-side. Telemetry must not unnecessarily log prompts containing PII or expose provider secrets/private user content. Model identifiers are configuration, not scattered application constants; provider pricing is not a permanent architectural assumption.

**O-012 / JLC-D011 — production voice/speech approach (D-051)**

- Do not add a separate paid/external speech provider for MVP. Use browser/native speech-to-text only as progressive enhancement where available; text is mandatory and remains the universal fallback.
- Voice is never required to create, search, or publish a listing. The existing AI orchestration receives text and does not require raw-audio processing.
- Jolcar does not persist raw voice recordings or require raw-audio upload for this launch flow. UI/privacy copy must accurately describe Jolcar's handling and must not claim all browser/OS recognition is local.
- Unsupported browsers/devices, denied permission, recognition errors, and platform unavailability always fall back to text; no core workflow may fail because voice is unavailable.
- Preserve a provider-neutral speech boundary for future React Native/native clients. A future external speech provider requires a separate explicit decision/authorization.

These approvals are policy-only. They do not authorize API keys, secrets, paid calls, billing, external speech vendors, staging or production integration, deployment, or any action covered by JLC-1007 or JLC-900* manual authorization tasks.

<!-- JOLCAR_FIRST_MVP_SCOPE_CORRECTION_2026-10-21 -->
## First public Jolcar Kazakhstan MVP launch scope — 2026-10-21

The owner clarified the first public MVP scope during the overnight production
launch authorization:

- Dealer Live / Amazon IVS (JLC-0917) is deferred post-launch and does not gate
  the first public marketplace launch. Preserve the existing implementation
  and abstractions; do not provision IVS resources for MVP.
- External paid AI/voice (JLC-1007) is optional post-launch. The marketplace
  must work with those features disabled; do not activate paid AI/voice for
  first launch.
- The final Jolcar custom domain remains unresolved and must not be guessed.
  It blocks only custom-domain/DNS/Auth callback cutover, not production
  deployment or smoke on the temporary Vercel host.
- The minimum initial production stack is the canonical Supabase project,
  production web deployment, Kazakhstan registration OTP plus phone/password
  routine login, core marketplace and moderation, seller/contact, Storage/media,
  and controlled production smoke.

This corrects first-MVP scope only. Existing feature code remains preserved.
