# OTOYALI — Product Vision

**Version:** 1.0.0  
**Domain:** [otoyali.com](https://otoyali.com)  
**Classification:** Internal — Strategic  
**Last Updated:** 2026-06-29  
**Owner:** Product & Engineering Leadership

---

## Executive Summary

OTOYALI is Turkey's AI-first automotive super-app — a unified digital ecosystem where consumers, dealers, fleet operators, insurers, financiers, and service providers discover, evaluate, transact, and manage every aspect of vehicle ownership and commerce.

We are not building another classifieds site. We are building the **operating system for automotive life in Turkey** — from first search to final sale, from spare parts to insurance renewal, from VIN verification to AI-powered valuation.

**North Star Metric:** Monthly Active Transactors (MAT) — users who complete a meaningful action (inquiry, valuation, purchase, service booking, insurance quote) per month.

**10-Year Ambition:** 100M+ registered users, 50M+ monthly active users, the default entry point for any automotive decision in Turkey and expansion markets.

---

## Mission

> Democratize trust, transparency, and intelligence in automotive commerce — so every Turkish citizen can buy, sell, maintain, and finance vehicles with the confidence of an expert.

---

## Vision (2035)

OTOYALI becomes the **Bloomberg + Amazon + Carfax + Uber** of automotive in Turkey:

- **Discovery layer:** AI search that understands intent, not keywords
- **Trust layer:** VIN history, verified sellers, fraud detection, escrow
- **Intelligence layer:** Real-time valuation, market analytics, price predictions
- **Transaction layer:** Listings, financing, insurance, paid promotions
- **Service layer:** Maintenance booking, spare parts marketplace, fleet management
- **Content layer:** News, reviews, ownership guides in Turkish and English

---

## Problem Statement

### Consumer Pain Points

| Problem | Current State | OTOYALI Solution |
|---------|---------------|------------------|
| Information asymmetry | Sellers know more than buyers | AI valuation, VIN history, market comparables |
| Fragmented search | Users browse 5+ platforms | Unified AI search across all vehicle types |
| Trust deficit | Scams, odometer fraud, hidden damage | Verified listings, VIN checks, escrow payments |
| Language barrier | English tools don't fit Turkish market | Native Turkish UX with English support |
| Complex financing | Opaque bank processes | Integrated financing comparison & pre-approval |
| Insurance confusion | Multiple brokers, unclear coverage | AI-guided insurance matching |
| Spare parts chaos | Counterfeit parts, wrong fitment | VIN-matched parts catalog with AI fitment |
| Service discovery | Word-of-mouth, unreliable reviews | Verified service providers with booking |

### Business Pain Points

| Segment | Pain | OTOYALI Solution |
|---------|------|------------------|
| Dealers | Lead quality, marketing cost | Paid listings, AI lead scoring, CRM integration |
| Fleet operators | Asset tracking, maintenance | Fleet dashboard, bulk listings, analytics |
| Insurers | Customer acquisition cost | Embedded quotes at point of intent |
| Financiers | Loan origination friction | Pre-qualification at listing view |
| Parts suppliers | Distribution, returns | Marketplace with fitment AI |
| Media/publishers | Monetization | News syndication, sponsored content APIs |

---

## Target Users & Personas

### Primary Personas

#### 1. Ahmet — First-Time Buyer (B2C)
- **Age:** 28, Istanbul
- **Goal:** Buy first used car under ₺800,000
- **Behavior:** Mobile-first, price-sensitive, needs guidance
- **OTOYALI Value:** AI assistant walks through budget, recommends cars, explains financing, flags risky listings

#### 2. Elif — Private Seller (C2C)
- **Age:** 35, Ankara
- **Goal:** Sell family SUV quickly at fair price
- **Behavior:** Lists on 2-3 platforms, hates spam calls
- **OTOYALI Value:** AI-generated listing, instant valuation, verified buyer messaging, optional paid boost

#### 3. Mehmet — Dealer Principal (B2B)
- **Age:** 45, Izmir
- **Goal:** Move inventory, maximize margin
- **Behavior:** Uses DMS, needs qualified leads
- **OTOYALI Value:** Dealer dashboard, bulk upload, analytics, paid placement, lead CRM

#### 4. Zeynep — Fleet Manager (B2B)
- **Age:** 38, corporate
- **Goal:** Manage 200-vehicle fleet lifecycle
- **Behavior:** Spreadsheet-heavy, compliance-focused
- **OTOYALI Value:** Fleet module, bulk valuation, maintenance scheduling, disposal listings

#### 5. Can — Motorcycle Enthusiast (Niche)
- **Age:** 24, Antalya
- **Goal:** Find rare sport bike, connect with community
- **OTOYALI Value:** Dedicated motorcycle vertical, community features, parts marketplace

#### 6. Sarah — Expat Buyer (International)
- **Age:** 32, English speaker in Turkey
- **Goal:** Buy car with English interface, understand Turkish market
- **OTOYALI Value:** Full English UI, AI explains local regulations, import/export guidance

---

## Product Pillars

### Pillar 1: Marketplace (Core)

Unified marketplace for:

- **Cars** — New, used, classic, electric (BEV/PHEV/HEV)
- **Motorcycles** — Sport, cruiser, scooter, off-road, electric
- **Commercial Vehicles** — Vans, trucks, buses, construction, agricultural
- **Spare Parts** — OEM, aftermarket, used; VIN/fitment matched
- **Services** — Maintenance, detailing, inspection, towing, customization

Each vertical shares: listings, search, messaging, payments, reviews — but has vertical-specific attributes, filters, and AI models.

### Pillar 2: AI Intelligence

| Capability | Description | User Impact |
|------------|-------------|-------------|
| **AI Assistant (Otoyali AI)** | Conversational agent for search, advice, listing creation | Replaces 10 tabs of research |
| **AI Valuation** | ML price estimate from comps, condition, market trends | Fair pricing for buy/sell |
| **AI Search** | Natural language + multimodal (photo) search | "Red automatic SUV under 1M with sunroof in Istanbul" |
| **AI Listing Generator** | Auto-generate title, description, highlights from photos + specs | 5-minute listing creation |
| **AI Fraud Detection** | Anomaly detection on listings, images, pricing | Platform trust |
| **AI Fitment** | Parts compatibility from VIN/model | Zero wrong-part orders |

### Pillar 3: Trust & Verification

- **VIN History** — Accident, ownership, mileage, lien checks (Turkish + international sources)
- **Seller Verification** — Phone OTP, ID (optional KYC for dealers), business registry
- **Listing Verification** — Photo authenticity, duplicate detection
- **Review System** — Transaction-linked reviews, sentiment analysis
- **Escrow** (Phase 3+) — Secure payment holding for high-value transactions

### Pillar 4: Financial Services

- **Financing** — Bank/NBFI partner integration, pre-qualification, EMI calculator
- **Insurance** — Quote comparison, policy binding (partner APIs)
- **Paid Listings** — Featured, urgent, spotlight, dealer packages
- **Subscriptions** — Dealer Pro, Fleet Pro, Premium Seller

### Pillar 5: Content & Community

- **News** — Automotive news, regulations, market reports (Turkish primary, English secondary)
- **Guides** — Buying guides, maintenance tips, EV transition
- **Alerts** — Price drop, new match, market movement notifications

---

## Feature Matrix (MVP → Scale)

| Feature | MVP (P0) | Growth (P1) | Scale (P2) | Enterprise (P3) |
|---------|----------|-------------|------------|-----------------|
| Car listings (CRUD) | ✅ | | | |
| Motorcycle listings | ✅ | | | |
| Commercial listings | | ✅ | | |
| Spare parts marketplace | | ✅ | | |
| Services marketplace | | ✅ | | |
| Phone auth (OTP) | ✅ | | | |
| Turkish UI | ✅ | | | |
| English UI | | ✅ | | |
| Basic search & filters | ✅ | | | |
| AI search (NL) | | ✅ | | |
| AI assistant (chat) | | ✅ | | |
| AI valuation | | ✅ | | |
| VIN decode | ✅ | | | |
| VIN history (basic) | | ✅ | | |
| VIN history (full) | | | ✅ | |
| In-app messaging | ✅ | | | |
| Paid listing tiers | | ✅ | | |
| Dealer dashboard | | ✅ | | |
| Financing quotes | | | ✅ | |
| Insurance quotes | | | ✅ | |
| News CMS | | ✅ | | |
| Fleet management | | | | ✅ |
| Escrow payments | | | | ✅ |
| API for partners | | | ✅ | | |
| White-label dealer sites | | | | ✅ |

---

## Competitive Landscape

| Competitor | Strength | Weakness | OTOYALI Differentiation |
|------------|----------|----------|---------------------------|
| sahibinden.com | Massive inventory, brand trust | No AI, poor UX, no vertical depth | AI-first, automotive-only, trust layer |
| arabam.com | Automotive focus | Legacy tech, limited AI | Modern stack, AI valuation/search |
| letgo (defunct) | Simple UX | No trust, no vertical | Trust + intelligence |
| AutoScout24 (EU) | Premium UX | Not localized for Turkey | Turkey-native, Turkish regulations |
| Carvana (US) | End-to-end | US-only model | Adapted for Turkish market realities |

**Moat Strategy:**
1. **Data flywheel** — Every listing, search, transaction improves AI models
2. **Trust network** — VIN + verification creates irreplicable trust graph
3. **Partner ecosystem** — Banks, insurers, dealers locked in via API/integration
4. **Localization depth** — Turkish regulations, plate formats, tramer integration
5. **Multi-vertical** — Cars + motorcycles + commercial + parts in one graph

---

## Business Model

### Revenue Streams

| Stream | Model | Target ARPU |
|--------|-------|-------------|
| Paid Listings | Per-listing fee (₺99–₺999) + boost packages | ₺200/listing avg |
| Dealer Subscriptions | Monthly tiers (Basic/Pro/Enterprise) | ₺2,000–₺25,000/mo |
| Lead Generation | Pay-per-qualified-lead to dealers | ₺50–₺200/lead |
| Financing Referrals | Commission on originated loans | 0.5–1.5% of loan |
| Insurance Referrals | Commission on bound policies | 10–15% of premium |
| Parts Marketplace | Transaction fee (8–12%) | Variable |
| Advertising | Display, native, sponsored content | CPM/CPC |
| Data & Analytics | Market reports for OEMs, insurers | Enterprise contracts |
| API Access | Partner API tiers | ₺5,000+/mo |

### Unit Economics Target (Year 3)

- **CAC (Consumer):** ₺15 via organic + referral
- **CAC (Dealer):** ₺500 via sales team
- **LTV (Consumer):** ₺120 (3 transactions × ₺40 referral value)
- **LTV (Dealer):** ₺48,000 (24 months × ₺2,000 subscription)
- **Gross Margin:** 75%+ (software marketplace model)

---

## Success Metrics (OKRs)

### Year 1
- 500K registered users
- 100K active listings
- 50 dealer partners
- AI valuation accuracy within 8% of sale price
- NPS ≥ 45

### Year 3
- 10M registered users
- 2M active listings
- 5,000 dealer partners
- ₺500M GMV (financing + parts + services)
- Market share #2 in Turkey automotive classifieds

### Year 5
- 50M registered users
- Category leader in Turkey
- Expansion to MENA/Balkans
- AI assistant handles 60% of search sessions

---

## Localization Strategy

### Turkish (Default)
- All UI, notifications, legal docs, AI responses in Turkish
- Turkish number/currency formatting (₺1.234.567)
- Turkish phone format (+90 5XX XXX XX XX)
- Turkish plate format (34 ABC 123)
- Integration with Turkish government APIs (tramer, noter, etc.)

### English (Secondary)
- Full UI translation via i18n keys
- AI assistant bilingual (detects user language)
- English news content subset
- Expat-focused guides and regulatory explainers

### Future Languages
- Arabic (MENA expansion)
- German (Turkish diaspora)

---

## Regulatory & Compliance Considerations

| Domain | Requirement | Approach |
|--------|-------------|----------|
| KVKK (GDPR-equivalent) | Personal data protection | Privacy by design, DPO, consent management |
| E-commerce Law | Distance selling, returns | Terms of service, consumer rights flow |
| Financial regulations | Broker licensing for finance/insurance | Partner with licensed entities |
| Advertising Law | Truthful listing claims | AI moderation + human review |
| Vehicle registration | Accurate vehicle data | VIN validation, government API integration |
| AML/KYC | Dealer verification | Tiered KYC based on transaction volume |

---

## Brand & Experience Principles

1. **Trust First** — Every screen reinforces safety and transparency
2. **Intelligence Everywhere** — AI is not a feature; it's the interface
3. **Speed** — Sub-200ms search, instant valuation, one-tap actions
4. **Clarity** — No jargon; explain automotive concepts simply
5. **Inclusive** — Accessible (WCAG 2.1 AA), works on ₺3,000 Android phones
6. **Delight** — Micro-animations, smart defaults, proactive suggestions

---

## Out of Scope (V1)

- Direct vehicle sales (we are marketplace, not dealer)
- Physical inspection services (partner integration only)
- Vehicle rental (future vertical)
- Autonomous vehicle data (future)
- Cryptocurrency payments
- NFT vehicle ownership records

---

## Document References

| Document | Purpose |
|----------|---------|
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | Technical architecture |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Data model |
| [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md) | AI/ML systems |
| [ROADMAP.md](./ROADMAP.md) | Delivery timeline |
| [API_DESIGN.md](./API_DESIGN.md) | API contracts |
| [FLUTTERFLOW_STRUCTURE.md](./FLUTTERFLOW_STRUCTURE.md) | Frontend structure |
| [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) | Backend setup |
| [SECURITY.md](./SECURITY.md) | Security framework |
| [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md) | Engineering standards |

---

*This document is the single source of truth for OTOYALI product direction. All engineering decisions must align with this vision.*
