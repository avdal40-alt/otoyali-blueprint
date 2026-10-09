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
| P-003 | PROPOSAL | AI | Use a single server-only OpenAI provider adapter behind secure AI runtime. | Historical AI recommendation, not final provider decision. |
| P-004 | PROPOSAL | Live | Candidate providers include Mux, AWS IVS or Cloudflare-class services. | Exact provider open. |
| P-005 | PROPOSAL | Dealer monetization | Dealer Free/Pro/Live tiers and promoted live inventory. | Commercial packaging not approved. |
| P-006 | PROPOSAL | Vehicle reviews | Category scores such as reliability/comfort/handling/dynamics/cost. | Concept approved; exact scale may be refined. |

## Open decisions

| ID | Status | Area | Question | Blocking impact |
|---|---|---|---|---|
| O-001 | OPEN | Localization | Which locales are required for Jolcar Kazakhstan launch? | Blocks final localized copy/SEO. |
| O-002 | OPEN | Brand/domain | What is the final Jolcar domain/host and brand kit? | Blocks domain/SEO cutover. |
| O-003 | OPEN | Design | Final accent color? | Blocks final visual brand lock, not core logic. |
| O-004 | OPEN | Design | Final listing-card ratio: 4:3 or 3:2 if current UI is not already accepted? | Blocks final card design lock. |
| O-005 | OPEN | Phone/SMS | Exact Kazakhstan seller phone policy and production SMS provider? | Blocks production OTP activation. |
| O-006 | OPEN | Geo | Approved Kazakhstan cities/geo source if repo lacks one? | Blocks final location dataset. |
| O-007 | OPEN | Dealer verification | What documents/criteria make a Kazakhstan dealer verified? | Blocks production verification policy. |
| O-008 | OPEN | Dealer import | Which feed formats and API auth are required at launch? | Blocks specific adapters. |
| O-009 | OPEN | Promotion | How does “Raise to top” work: entitlement, frequency, duration, ranking? | Blocks promotion behavior. |
| O-010 | OPEN | Live | Which streaming provider is approved? | Blocks real provider integration/secrets. |
| O-011 | OPEN | AI | Which external AI provider/model/cost limits are approved? | Blocks real provider activation. |
| O-012 | OPEN | Voice | Which speech/voice provider or browser-native approach is approved if external service is needed? | Blocks production voice activation. |
| O-013 | OPEN | VIN/trust | Which Kazakhstan official/partner source may provide VIN/history data? | Blocks external history integration. |
| O-014 | OPEN | Analytics | Which production analytics/telemetry vendor is approved? | Blocks vendor-specific telemetry. |
| O-015 | OPEN | Legal/support | Final Kazakhstan legal/privacy/terms/support content and owner? | Blocks final production launch gate. |
| O-016 | OPEN | Native apps | Must native iOS/Android launch with first public web release or afterward? | Does not block web unless user reclassifies. |
| O-017 | OPEN | News | Which approved/licensed/editorial automotive news source should Jolcar use? | Blocks external news ingestion, not the news UI/domain foundation. |

## Historical implementation note

Historical YOLMOD audits/commits indicate many reusable capabilities already exist or partially exist, including browse/search/detail, listing lifecycle, moderation, favorites, saved searches, media security, messaging work, seller-contact work and an AI foundation.

**No Jolcar task is complete from this evidence alone.** The Jolcar baseline audit must confirm current Git and tests before reuse.
