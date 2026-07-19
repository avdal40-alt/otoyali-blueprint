# OTOYALI — Product & Engineering Roadmap

**Version:** 1.0.0  
**Classification:** Internal — Strategic  
**Last Updated:** 2026-07-19
**Owner:** Product & Engineering Leadership  
**Planning Horizon:** 2026 Q3 — 2028 Q4

---

## Table of Contents

1. [Roadmap Overview](#1-roadmap-overview)
2. [Phase 0: Foundation (Q3 2026)](#2-phase-0-foundation-q3-2026)
3. [Phase 1: MVP Launch (Q4 2026)](#3-phase-1-mvp-launch-q4-2026)
4. [Phase 2: Growth Engine (Q1–Q2 2027)](#4-phase-2-growth-engine-q1q2-2027)
5. [Phase 3: Market Leader (Q3–Q4 2027)](#5-phase-3-market-leader-q3q4-2027)
6. [Phase 4: Platform Scale (2028)](#6-phase-4-platform-scale-2028)
7. [Team Scaling Plan](#7-team-scaling-plan)
8. [Risk Register](#8-risk-register)
9. [Dependencies & Critical Path](#9-dependencies--critical-path)
10. [Release Cadence](#10-release-cadence)

---

## 1. Roadmap Overview

```
2026 Q3          2026 Q4          2027 H1          2027 H2          2028
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ PHASE 0  │───▶│ PHASE 1  │───▶│ PHASE 2  │───▶│ PHASE 3  │───▶│ PHASE 4  │
│Foundation│    │MVP Launch│    │ Growth   │    │  Leader  │    │  Scale   │
│          │    │          │    │  Engine  │    │          │    │          │
│ Infra    │    │ Cars +   │    │ AI Full  │    │ Finance  │    │ 100M     │
│ Auth     │    │ Motorcyc.│    │ Dealers  │    │ Insurance│    │ Users    │
│ Schema   │    │ Basic    │    │ Parts    │    │ Fleet    │    │ MENA     │
│          │    │ Search   │    │ Services │    │ Escrow   │    │ API      │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
  10K users       500K users      3M users       10M users      50M+ users
```

---

## 2. Phase 0: Foundation (Q3 2026)

**Duration:** 8 weeks (Jul–Aug 2026)  
**Goal:** Production-ready infrastructure, core schema, auth, and development pipeline  
**Team:** 6 engineers + 1 designer + 1 PM

### Sprint Breakdown

#### Sprint 0.1 (Weeks 1–2): Infrastructure Setup
| Task | Owner | Deliverable | Status |
|------|-------|-------------|--------|
| Supabase project provisioning (dev, staging, prod) | DevOps | 3 environments live | — |
| Cloudflare DNS + CDN + WAF configuration | DevOps | otoyali.com routing | — |
| GitHub monorepo setup + CI/CD pipeline | DevOps | Actions workflows | — |
| Database schema v1 migration | Backend | All core tables + RLS | — |
| FlutterFlow project creation | Frontend | Project scaffold | — |
| Development rules documentation | All | DEVELOPMENT_RULES.md | — |
| Security baseline | Security | SECURITY.md implemented | — |

#### Sprint 0.2 (Weeks 3–4): Auth & Identity
| Task | Owner | Deliverable | Status |
|------|-------|-------------|--------|
| Phone OTP auth (Twilio/Netgsm) | Backend | Working OTP flow | — |
| Profile creation flow | Full-stack | Registration → profile | — |
| JWT + RLS policy testing | Backend | Auth test suite | — |
| FlutterFlow auth screens | Frontend | Login, OTP, profile setup | — |
| i18n framework setup (tr-TR, en-US) | Frontend | Translation keys structure | — |
| Storage buckets + upload pipeline | Backend | Image upload working | — |

#### Sprint 0.3 (Weeks 5–6): Core Marketplace
| Task | Owner | Deliverable | Status |
|------|-------|-------------|--------|
| Vehicle makes/models seed data | Backend | 50+ makes, 500+ models | — |
| Listing CRUD Edge Functions | Backend | create, update, delete, publish | — |
| Listing creation UI (FlutterFlow) | Frontend | Multi-step listing wizard | — |
| Listing detail page | Frontend | Photo gallery, specs, contact | — |
| Basic search (PostgreSQL full-text) | Backend | Filter + sort + pagination | — |
| Search results UI | Frontend | List + grid view, filters | — |

#### Sprint 0.4 (Weeks 7–8): Integration & QA
| Task | Owner | Deliverable | Status |
|------|-------|-------------|--------|
| VIN decode integration | Backend | NHTSA + local DB | — |
| Homepage + navigation | Frontend | Bottom nav, categories | — |
| Messaging foundation | Full-stack | Conversation + text messages | — |
| Favorites + saved searches | Full-stack | Save/unsave, alerts stub | — |
| E2E test suite (critical paths) | QA | Auth, listing, search tests | — |
| Performance baseline | DevOps | Load test 100 concurrent users | — |
| Staging deployment | DevOps | staging.otoyali.com live | — |

### Phase 0 Exit Criteria
- [ ] User can register with phone, create listing, search, view detail, message seller
- [ ] All RLS policies tested and passing
- [ ] CI/CD deploys to staging on merge to develop
- [ ] Lighthouse score > 80 on web
- [ ] API p95 latency < 500ms on staging

---

## 3. Phase 1: MVP Launch (Q4 2026)

**Duration:** 12 weeks (Sep–Nov 2026)  
**Goal:** Public beta launch with cars + motorcycles, basic AI, paid listings  
**Target:** 500K registered users, 100K active listings  
**Team:** 12 engineers + 2 designers + 2 PMs + 1 data engineer

### Sprint 1.1 (Weeks 9–10): Motorcycle Vertical + Polish
| Task | Priority | Deliverable |
|------|----------|-------------|
| Motorcycle-specific attributes + filters | P0 | Category live |
| Listing photo gallery improvements | P0 | Swipe, zoom, full-screen |
| User profile page + my listings | P0 | Seller dashboard basic |
| Push notifications (FCM) | P0 | New message, price alert |
| App Store + Google Play submission prep | P0 | Store listings, screenshots |

### Sprint 1.2 (Weeks 11–12): AI Valuation + VIN
| Task | Priority | Deliverable |
|------|----------|-------------|
| AI valuation model v1 (cars) | P0 | ±12% MAPE target |
| Valuation UI widget on listing create + detail | P0 | Price suggestion |
| VIN scanner (camera OCR) | P1 | In-app VIN scan |
| VIN history basic report (Tramer) | P1 | Paid report flow |
| AI listing description generator v1 | P1 | Auto-generate on create |

### Sprint 1.3 (Weeks 13–14): Commerce + Paid Listings
| Task | Priority | Deliverable |
|------|----------|-------------|
| iyzico payment integration | P0 | Card payment working |
| Paid listing packages (3 tiers) | P0 | Boost, premium, spotlight |
| Payment flow UI | P0 | Purchase → activate promotion |
| Invoice generation | P1 | PDF invoice email |
| Promotion analytics (impressions, clicks) | P1 | Seller sees boost stats |

### Sprint 1.4 (Weeks 15–16): AI Assistant v1
| Task | Priority | Deliverable |
|------|----------|-------------|
| AI assistant chat UI | P0 | In-app chat widget |
| Search + valuation tools | P0 | Assistant can search and valuate |
| Buying guide responses | P1 | FAQ + guide content |
| Conversation history | P1 | Resume previous chats |
| AI assistant English support | P2 | Bilingual responses |

### Sprint 1.5 (Weeks 17–18): Search Upgrade + SEO
| Task | Priority | Deliverable |
|------|----------|-------------|
| Elasticsearch integration | P0 | Faceted search live |
| Search filters UI overhaul | P0 | Make/model/year/price/geo |
| SEO landing pages (Flutter Web) | P0 | /araba, /motosiklet indexable |
| Sitemap generation | P0 | Auto-updated XML sitemap |
| Structured data (JSON-LD) | P1 | Google rich results |

### Sprint 1.6 (Weeks 19–20): Launch Prep
| Task | Priority | Deliverable |
|------|----------|-------------|
| Load testing (10K concurrent) | P0 | Performance report |
| Security audit (external) | P0 | Pen test report |
| KVKK compliance review | P0 | Privacy policy, consent flows |
| Beta user onboarding (1000 users) | P0 | Feedback collection |
| Monitoring + alerting production | P0 | Grafana dashboards, PagerDuty |
| **PUBLIC BETA LAUNCH** | P0 | otoyali.com live |

### Phase 1 Exit Criteria
- [ ] 500K registered users
- [ ] 100K active listings (cars + motorcycles)
- [ ] AI valuation live with <12% MAPE
- [ ] Paid listings generating revenue
- [ ] App Store + Google Play approved
- [ ] 99.5% uptime during beta
- [ ] NPS ≥ 40

---

## 4. Phase 2: Growth Engine (Q1–Q2 2027)

**Duration:** 24 weeks  
**Goal:** Full AI suite, dealer platform, parts + services, commercial vehicles  
**Target:** 3M registered users, 500K active listings, 50 dealer partners  
**Team:** 20 engineers + 3 designers + 3 PMs + 2 data engineers + 1 ML engineer

### Q1 2027 (Weeks 21–32)

#### AI Search + NL
| Task | Priority | Deliverable |
|------|----------|-------------|
| AI natural language search | P0 | "kırmızı otomatik SUV istanbul" works |
| Embedding pipeline for listings | P0 | pgvector semantic search |
| Hybrid search (keyword + semantic + filters) | P0 | RRF fusion ranking |
| Voice search (Whisper integration) | P2 | Microphone → search |
| Photo search (visual similarity) | P2 | Upload photo → similar listings |

#### Dealer Platform
| Task | Priority | Deliverable |
|------|----------|-------------|
| Dealer registration + KYC | P0 | Business verification flow |
| Dealer dashboard | P0 | Inventory, leads, analytics |
| Bulk listing upload (CSV/API) | P0 | 100+ listings per upload |
| Dealer subscription plans (3 tiers) | P0 | Basic/Pro/Enterprise |
| Lead management CRM basic | P1 | Inquiry tracking, follow-up |

#### Commercial Vehicles
| Task | Priority | Deliverable |
|------|----------|-------------|
| Commercial vehicle category | P0 | Trucks, vans, buses live |
| Commercial-specific filters | P0 | GVW, payload, axles, euro class |
| Commercial valuation model | P1 | ±15% MAPE target |

### Q2 2027 (Weeks 33–44)

#### Spare Parts Marketplace
| Task | Priority | Deliverable |
|------|----------|-------------|
| Parts listing CRUD | P0 | Create, search, buy parts |
| VIN/fitment matching | P0 | "Does this fit my car?" |
| Parts search with OEM numbers | P0 | Search by part number |
| Parts seller onboarding | P1 | Supplier registration |
| Parts order flow (basic) | P1 | Inquiry → purchase intent |

#### Services Marketplace
| Task | Priority | Deliverable |
|------|----------|-------------|
| Service provider listings | P0 | Maintenance, detailing, etc. |
| BOOKING-01A universal booking foundation | P0 | Reusable booking schema, availability RPCs, lifecycle controls |
| BOOKING-01B customer/provider booking flow | P0 | Date/time selection and provider confirmation UI |
| Service reviews + ratings | P0 | Post-service review |
| Service provider dashboard | P1 | Booking management |

#### Content Platform
| Task | Priority | Deliverable |
|------|----------|-------------|
| News CMS (admin) | P0 | Create, publish articles |
| News reader (app + web) | P0 | Category browsing, article detail |
| English news translation (AI) | P1 | Auto-translate top articles |
| SEO blog integration | P1 | /haber section indexed |

#### Fraud + Trust
| Task | Priority | Deliverable |
|------|----------|-------------|
| Fraud detection model v1 | P0 | Auto-flag suspicious listings |
| Photo duplicate detection | P0 | Stock photo / cross-listing detection |
| Moderation admin panel | P0 | Review queue, approve/reject |
| Seller trust score | P1 | Visible trust badge |

### Phase 2 Exit Criteria
- [ ] 3M registered users
- [ ] 500K active listings across all verticals
- [ ] 50+ dealer partners on subscription
- [ ] AI search handling 30%+ of searches
- [ ] Parts marketplace: 10K+ parts listed
- [ ] Services: 1K+ providers
- [ ] Fraud detection precision > 85%
- [ ] Revenue: ₺5M/month

---

## 5. Phase 3: Market Leader (Q3–Q4 2027)

**Duration:** 24 weeks  
**Goal:** Financial services, full VIN history, fleet management, escrow  
**Target:** 10M registered users, 2M active listings, 500 dealers  
**Team:** 35 engineers + 4 designers + 4 PMs + 3 data engineers + 2 ML engineers

### Q3 2027 (Weeks 45–56)

#### Financing Integration
| Task | Priority | Deliverable |
|------|----------|-------------|
| Bank partner API integration (2 banks) | P0 | Live loan quotes |
| Financing calculator on listing detail | P0 | EMI display |
| Pre-qualification flow | P0 | Soft credit check → offer |
| Financing application submission | P1 | Full application to bank |
| Dealer financing dashboard | P1 | Lead → application tracking |

#### Insurance Integration
| Task | Priority | Deliverable |
|------|----------|-------------|
| Insurance partner API (2 insurers) | P0 | Kasko + trafik quotes |
| Insurance comparison UI | P0 | Side-by-side quotes |
| AI insurance advisor (in assistant) | P1 | Explain coverage types |
| Policy binding flow | P2 | Purchase policy in-app |

#### VIN History Full
| Task | Priority | Deliverable |
|------|----------|-------------|
| Full Tramer integration | P0 | Complete accident/ownership history |
| AI VIN report summary | P0 | Human-readable Turkish summary |
| VIN history subscription (unlimited) | P1 | Monthly plan for dealers |
| Odometer fraud detection | P1 | Mileage timeline analysis |

### Q4 2027 (Weeks 57–68)

#### Fleet Management
| Task | Priority | Deliverable |
|------|----------|-------------|
| Fleet account type | P0 | Multi-vehicle management |
| Fleet dashboard | P0 | Inventory, valuation, disposal |
| Bulk operations (price update, export) | P0 | CSV export, bulk edit |
| Fleet analytics | P1 | TCO, depreciation, utilization |
| Fleet subscription tier | P0 | Enterprise pricing |

#### Escrow Payments
| Task | Priority | Deliverable |
|------|----------|-------------|
| Escrow payment flow design | P0 | Legal review complete |
| Escrow Edge Function + iyzico | P0 | Hold → verify → release |
| Escrow UI (buyer + seller) | P0 | Payment status tracking |
| Dispute resolution workflow | P1 | Admin mediation panel |

#### Platform Maturity
| Task | Priority | Deliverable |
|------|----------|-------------|
| Partner API v1 (public) | P0 | REST API docs, API keys |
| Webhook system | P0 | Event notifications for partners |
| Advanced analytics dashboard | P1 | Market trends, price indices |
| Recommendation engine v2 | P1 | Personalized homepage feed |
| Elasticsearch cluster (3 node) | P0 | Search scale for 2M listings |

### Phase 3 Exit Criteria
- [ ] 10M registered users
- [ ] 2M active listings
- [ ] 500+ dealer partners
- [ ] Financing: 1000+ applications/month
- [ ] Insurance: 500+ quotes/month
- [ ] Fleet: 50+ fleet accounts
- [ ] Revenue: ₺30M/month
- [ ] Market position: #2 in Turkey automotive

---

## 6. Phase 4: Platform Scale (2028)

**Duration:** Full year  
**Goal:** 50M+ users, MENA expansion, full microservices, API ecosystem  
**Target:** Category leader, ₺100M+/month revenue  
**Team:** 60+ engineers

### H1 2028

| Initiative | Description | Target |
|------------|-------------|--------|
| Microservices extraction | Listing, Search, Payment services independent | 50K QPS |
| Multi-region deployment | Read replicas in EU + MENA | <50ms latency Turkey |
| MENA expansion prep | Arabic UI, UAE/Saudi market research | Launch plan |
| Self-hosted LLM | Cost reduction for high-volume AI tasks | 50% LLM cost reduction |
| Advanced ML | Price prediction 6-month forecast, demand modeling | New revenue product |
| White-label dealer sites | Dealer.otoyali.com custom domains | 100 dealer sites |

### H2 2028

| Initiative | Description | Target |
|------------|-------------|--------|
| MENA launch (UAE) | Arabic UI, local payment, local inventory | 1M MENA users |
| API marketplace | Third-party apps on OTOYALI platform | 50 API partners |
| Auction platform | Live vehicle auctions | New vertical |
| EV ecosystem | EV-specific search, charging map, battery health | EV leadership |
| B2B data products | Market intelligence for OEMs, insurers | ₺10M/year data revenue |
| Mobile SDK | Embed OTOYALI search/valuation in partner apps | 10 SDK integrations |

### Phase 4 Exit Criteria
- [ ] 50M+ registered users
- [ ] 30M MAU
- [ ] Category leader in Turkey
- [ ] MENA presence (1M+ users)
- [ ] Revenue: ₺100M+/month
- [ ] 99.9% uptime SLA
- [ ] API ecosystem: 50+ partners

---

## 7. Team Scaling Plan

| Phase | Engineers | Design | PM | Data/ML | QA | DevOps | Total |
|-------|-----------|--------|-----|---------|-----|--------|-------|
| Phase 0 | 6 | 1 | 1 | 0 | 1 | 1 | 10 |
| Phase 1 | 12 | 2 | 2 | 1 | 2 | 1 | 20 |
| Phase 2 | 20 | 3 | 3 | 3 | 3 | 2 | 34 |
| Phase 3 | 35 | 4 | 4 | 5 | 4 | 3 | 55 |
| Phase 4 | 60 | 6 | 6 | 8 | 6 | 4 | 90 |

### Hiring Priority by Phase

**Phase 0–1:** Full-stack (Supabase/FlutterFlow), mobile, backend (Edge Functions)  
**Phase 2:** ML engineer, data engineer, search engineer, frontend  
**Phase 3:** Integration engineer, security, SRE, financial services  
**Phase 4:** Platform architect, MENA team, API product manager

---

## 8. Risk Register

| ID | Risk | Impact | Probability | Mitigation |
|----|------|--------|-------------|------------|
| R1 | Supabase scaling limits at 10M+ users | High | Medium | Microservices extraction plan ready at Phase 3 |
| R2 | Tramer API access denied/delayed | High | Medium | Alternative data providers, manual report upload |
| R3 | iyzico integration complexity | Medium | Low | Early integration in Phase 0, sandbox testing |
| R4 | AI valuation inaccuracy damages trust | High | Medium | Wide price ranges, disclaimers, continuous retraining |
| R5 | FlutterFlow limitations for complex UI | Medium | High | Custom Flutter code for AI chat, maps, camera |
| R6 | Regulatory changes (KVKK, e-commerce) | Medium | Medium | Legal counsel retainer, compliance-first design |
| R7 | Competitor response (price war) | Medium | High | Differentiate on AI + trust, not price |
| R8 | Key person dependency | High | Medium | Documentation-first culture, pair programming |
| R9 | SMS OTP delivery failures | High | Low | Dual provider (Twilio + Netgsm), email fallback |
| R10 | LLM cost overrun | Medium | Medium | Model routing, caching, budget alerts |

---

## 9. Dependencies & Critical Path

```
Critical Path:
  Supabase Setup → Auth → Listings CRUD → Search → Launch
                                    │
                                    ├── AI Valuation → AI Assistant
                                    ├── Payments → Paid Listings
                                    └── VIN Decode → VIN History

Parallel Tracks:
  Track A: Core Marketplace (listings, search, messaging)
  Track B: AI Platform (valuation, assistant, search)
  Track C: Commerce (payments, subscriptions, promotions)
  Track D: Content (news, guides, SEO)
  Track E: Integrations (VIN, financing, insurance)
```

### Hard Dependencies

| Feature | Depends On | Blocker? |
|---------|-----------|----------|
| AI Valuation | Listing data + sold prices | Yes — needs 1000+ listings |
| AI Search | Embedding pipeline + ES | Yes — needs ES cluster |
| Paid Listings | iyzico integration | Yes |
| VIN History | Tramer API access | Yes — legal agreement |
| Dealer Dashboard | Auth + Listing CRUD | Yes |
| Financing | KYC + partner API | Yes — partner contract |
| Fleet Management | Dealer platform | Yes |

---

## 10. Release Cadence

| Release Type | Frequency | Audience | Approval |
|-------------|-----------|----------|----------|
| Hotfix | As needed | Production | Tech lead |
| Patch | Weekly (Wednesday) | Production | QA sign-off |
| Minor | Bi-weekly (Sprint end) | Staging → Prod | PM + QA |
| Major | Monthly | Staging → Prod | PM + CTO |
| App Store | Bi-weekly (after patch) | iOS + Android | App review |

### Version Numbering

```
MAJOR.MINOR.PATCH (Semantic Versioning)
1.0.0 — MVP Launch
1.1.0 — AI Valuation
1.2.0 — Paid Listings
2.0.0 — AI Search + Dealers
2.1.0 — Parts + Services
3.0.0 — Financing + Insurance
4.0.0 — Fleet + Escrow
```

---

## Document References

| Document | Purpose |
|----------|---------|
| [PRODUCT_VISION.md](./PRODUCT_VISION.md) | Product direction |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | Technical architecture |
| [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md) | Engineering standards |

---

*This roadmap is a living document. Reviewed bi-weekly in sprint planning, adjusted quarterly in OKR reviews.*
