# OTOYALI — System Architecture

**Version:** 1.0.0  
**Classification:** Internal — Engineering  
**Last Updated:** 2026-06-29  
**Owner:** Platform Architecture Team

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Design Principles](#2-design-principles)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Client Layer](#4-client-layer)
5. [Edge & Gateway Layer](#5-edge--gateway-layer)
6. [Application Layer](#6-application-layer)
7. [Data Layer](#7-data-layer)
8. [AI/ML Layer](#8-aiml-layer)
9. [Integration Layer](#9-integration-layer)
10. [Infrastructure & DevOps](#10-infrastructure--devops)
11. [Scalability Strategy (100M+ Users)](#11-scalability-strategy-100m-users)
12. [Observability](#12-observability)
13. [Disaster Recovery & Business Continuity](#13-disaster-recovery--business-continuity)
14. [Technology Stack Summary](#14-technology-stack-summary)

---

## 1. Architecture Overview

OTOYALI follows a **modular monolith → microservices evolution** pattern. At launch, we deploy a Supabase-centric architecture with Edge Functions for business logic, evolving into domain-specific services as traffic and team scale demand.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ Flutter iOS  │  │Flutter Android│  │ Flutter Web  │  │ Partner APIs │   │
│  │ (FlutterFlow)│  │ (FlutterFlow) │  │(FlutterFlow) │  │   (REST)     │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
└─────────┼─────────────────┼─────────────────┼─────────────────┼─────────────┘
          │                 │                 │                 │
          └─────────────────┴────────┬────────┴─────────────────┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────────────┐
│                         EDGE & GATEWAY LAYER                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Cloudflare  │  │ API Gateway │  │   WAF /     │  │ Rate Limit  │          │
│  │ CDN + DNS   │  │ (Kong/CF)   │  │   DDoS      │  │ & Throttle  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘          │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────────────┐
│                         APPLICATION LAYER                                     │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐     │
│  │                    SUPABASE PLATFORM                                 │     │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │     │
│  │  │   Auth   │ │ PostgREST│ │ Realtime │ │ Storage  │ │  Edge    │  │     │
│  │  │ (Phone)  │ │   API    │ │ (WS)     │ │ (S3)     │ │Functions │  │     │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │     │
│  └─────────────────────────────────────────────────────────────────────┘     │
│                                                                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│  │   Listing    │ │   Search     │ │  Messaging   │ │  Payments    │          │
│  │   Service    │ │   Service    │ │  Service     │ │  Service     │          │
│  │ (Edge Fn)    │ │ (Edge+AI)    │ │ (Edge Fn)    │ │ (Edge Fn)    │          │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘          │
│                                                                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│  │  Valuation   │ │ VIN History  │ │  Financing   │ │  Insurance   │          │
│  │  Service     │ │  Service     │ │  Service     │ │  Service     │          │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘          │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────────────┐
│                              DATA LAYER                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ PostgreSQL  │  │   Redis     │  │Elasticsearch│  │  pgvector   │          │
│  │ (Primary)   │  │  (Cache)    │  │  (Search)   │  │ (Embeddings)│          │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                           │
│  │ ClickHouse  │  │   S3/R2     │  │  Kafka/     │                           │
│  │ (Analytics) │  │  (Media)    │  │  Redpanda   │                           │
│  └─────────────┘  └─────────────┘  └─────────────┘                           │
└───────────────────────────────────────────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────────────┐
│                           AI/ML LAYER                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ LLM Gateway │  │  Valuation  │  │   Vision    │  │   Fraud     │          │
│  │ (GPT/Claude)│  │  ML Model   │  │   Models    │  │  Detection  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘          │
└───────────────────────────────────────────────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼──────────────────────────────────────┐
│                        INTEGRATION LAYER                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Tramer  │ │   SMS    │ │ Payment  │ │  Banks   │ │ Insurers │           │
│  │  (VIN)   │ │ (Twilio) │ │ (iyzico) │ │  (APIs)  │ │  (APIs)  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Design Principles

| Principle | Description | Implementation |
|-----------|-------------|----------------|
| **AI-Native** | AI is not bolted on; every user flow has an AI enhancement path | LLM gateway, embedding pipeline from day 1 |
| **Mobile-First** | 85%+ of Turkish users are mobile-primary | FlutterFlow → Flutter, offline-capable patterns |
| **API-First** | Every feature exposed via API before UI | PostgREST + Edge Functions + OpenAPI spec |
| **Event-Driven** | Loose coupling via domain events | PostgreSQL NOTIFY → Kafka (scale phase) |
| **Security by Default** | Zero trust, RLS everywhere, encryption at rest/transit | Supabase RLS, Vault for secrets |
| **Observability-First** | If you can't measure it, you can't scale it | OpenTelemetry, structured logging |
| **Locale-Aware** | Turkish default, i18n from schema up | `locale` columns, translation tables |
| **Graceful Degradation** | AI/search failures fall back to traditional flows | Circuit breakers, cached responses |
| **Cost-Conscious Scale** | Optimize unit economics at each growth stage | Supabase → selective service extraction |

---

## 3. High-Level Architecture

### 3.1 Architecture Style

**Phase 1 (0–1M users):** Supabase Modular Monolith
- Single PostgreSQL database with schema separation
- Edge Functions for complex business logic
- PostgREST for CRUD
- Realtime for messaging and live updates

**Phase 2 (1M–10M users):** Hybrid Microservices
- Extract search to Elasticsearch cluster
- Extract AI inference to dedicated GPU workers
- Extract media processing to async queue
- Read replicas for PostgreSQL

**Phase 3 (10M–100M users):** Domain Microservices
- Listing Service (own DB)
- Search Service (Elasticsearch + vector)
- User/Auth Service (Supabase Auth + custom)
- Payment Service (PCI-compliant isolation)
- Notification Service (push, SMS, email)
- Analytics Service (ClickHouse)
- Event bus (Kafka/Redpanda)

### 3.2 Domain Boundaries

```
┌─────────────────────────────────────────────────────────────┐
│                    BOUNDED CONTEXTS                          │
├─────────────┬─────────────┬─────────────┬───────────────────┤
│   Identity  │  Marketplace│  Commerce   │   Intelligence    │
│             │             │             │                   │
│ • Users     │ • Listings  │ • Payments  │ • AI Assistant    │
│ • Auth      │ • Search    │ • Subscript.│ • Valuation       │
│ • Profiles  │ • Messaging │ • Paid Ads  │ • AI Search       │
│ • KYC       │ • Reviews   │ • Escrow    │ • Fraud Detection │
│ • Preferences│ • Favorites│ • Invoices  │ • Recommendations │
├─────────────┼─────────────┼─────────────┼───────────────────┤
│   Content   │  Financial  │  Operations │   Integration     │
│             │             │             │                   │
│ • News      │ • Financing │ • Admin     │ • VIN/Tramer      │
│ • Guides    │ • Insurance │ • Moderation│ • SMS/Email       │
│ • CMS       │ • Quotes    │ • Analytics │ • Partner APIs    │
│ • SEO       │ • Commissions│ • Support  │ • Webhooks        │
└─────────────┴─────────────┴─────────────┴───────────────────┘
```

---

## 4. Client Layer

### 4.1 FlutterFlow / Flutter Applications

| Platform | Framework | Build | Distribution |
|----------|-----------|-------|--------------|
| iOS | Flutter 3.x | FlutterFlow export + custom code | App Store |
| Android | Flutter 3.x | FlutterFlow export + custom code | Google Play |
| Web | Flutter Web | FlutterFlow export + custom code | otoyali.com |

### 4.2 Client Architecture Pattern

```
┌─────────────────────────────────────────┐
│              Presentation               │
│  Pages → Components → Widgets           │
├─────────────────────────────────────────┤
│              State Management           │
│  Provider / Riverpod (FlutterFlow default)│
├─────────────────────────────────────────┤
│              Service Layer              │
│  API Client → Supabase SDK → Edge Fn    │
├─────────────────────────────────────────┤
│              Local Storage              │
│  Hive/SQLite (cache, offline favorites) │
├─────────────────────────────────────────┤
│              Cross-Cutting              │
│  i18n, Analytics, Crash Reporting, Auth │
└─────────────────────────────────────────┘
```

### 4.3 Responsive Web Strategy

| Breakpoint | Layout | Navigation |
|------------|--------|------------|
| < 600px | Mobile single column | Bottom nav |
| 600–1024px | Tablet two column | Side drawer |
| > 1024px | Desktop multi-column | Top nav + sidebar |

FlutterFlow responsive settings per component; shared component library across breakpoints.

---

## 5. Edge & Gateway Layer

### 5.1 Cloudflare Configuration

```
otoyali.com
├── CDN (static assets, images via Transform Rules)
├── WAF (OWASP rules, bot management, Turkey geo rules)
├── DDoS Protection (automatic)
├── DNS (primary + failover)
├── Workers (edge caching for public listing pages — SEO)
└── R2 (media backup / cold storage)
```

### 5.2 API Gateway Routing

| Route Pattern | Target | Auth | Rate Limit |
|---------------|--------|------|------------|
| `/rest/v1/*` | Supabase PostgREST | JWT | 1000/min user |
| `/auth/v1/*` | Supabase Auth | Public/JWT | 10/min (OTP) |
| `/functions/v1/*` | Supabase Edge Functions | JWT/API Key | 100/min user |
| `/realtime/v1/*` | Supabase Realtime | JWT | 50 conn/user |
| `/storage/v1/*` | Supabase Storage | JWT | 500/min user |
| `/api/v1/public/*` | Edge Functions (public) | None | 60/min IP |
| `/api/v1/partner/*` | Edge Functions (partner) | API Key | Contract-based |

### 5.3 Rate Limiting Tiers

| Tier | Requests/min | Burst | Use Case |
|------|-------------|-------|----------|
| Anonymous | 60 | 10 | Public browse, SEO pages |
| Authenticated | 300 | 50 | Standard user |
| Premium/Dealer | 1000 | 200 | Dealer dashboard |
| Partner API | 5000 | 500 | Bank, insurer integrations |
| Internal | Unlimited | — | Admin, batch jobs |

---

## 6. Application Layer

### 6.1 Supabase Edge Functions (Deno/TypeScript)

Each Edge Function is a deployable unit with single responsibility:

| Function | Domain | Trigger | Description |
|----------|--------|---------|-------------|
| `listing-create` | Marketplace | HTTP POST | Validate, enrich, publish listing |
| `listing-search` | Marketplace | HTTP GET | Hybrid search (SQL + ES + AI) |
| `ai-assistant` | Intelligence | HTTP POST | LLM chat with tool use |
| `ai-valuation` | Intelligence | HTTP POST | Price prediction pipeline |
| `ai-search` | Intelligence | HTTP POST | NL → structured query |
| `vin-decode` | Integration | HTTP GET | VIN → vehicle specs |
| `vin-history` | Integration | HTTP GET | Tramer + cache lookup |
| `payment-webhook` | Commerce | HTTP POST | iyzico/Stripe callback |
| `paid-listing` | Commerce | HTTP POST | Boost/featured purchase |
| `financing-quote` | Financial | HTTP POST | Partner bank API proxy |
| `insurance-quote` | Financial | HTTP POST | Partner insurer API proxy |
| `notification-dispatch` | Operations | Queue/Event | Push/SMS/email fan-out |
| `media-process` | Marketplace | Storage trigger | Resize, watermark, moderate |
| `fraud-check` | Intelligence | Event | Listing/user anomaly scoring |
| `dealer-sync` | Integration | Cron/Webhook | Bulk inventory import |

### 6.2 Edge Function Internal Pattern

```typescript
// Standard Edge Function structure
export default async function handler(req: Request) {
  // 1. CORS + method validation
  // 2. Auth extraction (JWT / API key)
  // 3. Rate limit check (Redis)
  // 4. Input validation (Zod schema)
  // 5. Authorization (RLS supplement)
  // 6. Business logic
  // 7. Audit log
  // 8. Response (typed, localized errors)
}
```

### 6.3 Background Jobs

| Job | Engine | Frequency | Description |
|-----|--------|-----------|-------------|
| `expire-listings` | pg_cron | Hourly | Archive expired listings |
| `valuation-batch` | pg_cron | Daily | Re-valuate stale listings |
| `search-index-sync` | pg_cron + trigger | Real-time | ES index sync |
| `analytics-aggregate` | pg_cron | Hourly | Roll up metrics |
| `notification-batch` | Queue | Event-driven | Digest emails |
| `fraud-rescore` | pg_cron | Daily | Re-score suspicious accounts |
| `media-cleanup` | pg_cron | Weekly | Orphan storage cleanup |

---

## 7. Data Layer

### 7.1 PostgreSQL (Supabase) — Primary Store

- **Version:** PostgreSQL 15+
- **Extensions:** `pgvector`, `pg_trgm`, `postgis`, `pg_cron`, `pg_stat_statements`
- **Schema separation:** `public`, `auth`, `marketplace`, `commerce`, `content`, `analytics`, `ai`
- **Partitioning:** Listings by `created_at` (monthly), messages by `conversation_id` hash
- **RLS:** Enabled on ALL user-facing tables

See [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) for full schema.

### 7.2 Redis — Cache & Session

| Use Case | TTL | Eviction |
|----------|-----|----------|
| Search results cache | 5 min | LRU |
| Listing detail cache | 15 min | LRU |
| VIN decode cache | 30 days | LRU |
| Rate limit counters | 1 min | Fixed |
| Session enrichment | 24 hr | TTL |
| AI response cache | 1 hr | LRU |
| Featured listings | 5 min | LRU |

**Deployment:** Upstash Redis (serverless) → ElastiCache (scale phase)

### 7.3 Elasticsearch — Full-Text & Faceted Search

```
Index: listings
├── Fields: title, description, make, model, year, price, location, attributes
├── Analyzers: turkish_analyzer, english_analyzer
├── Facets: make, model, year, price_range, fuel, transmission, city
└── Geo: location (geo_point)

Index: parts
├── Fields: part_name, oem_number, compatible_models
└── Nested: fitment_data

Index: news
├── Fields: title, body, tags, published_at
└── Analyzers: turkish_analyzer
```

**Sync:** PostgreSQL triggers → Edge Function → ES bulk API (debounced 5s)

### 7.4 pgvector — Semantic Search

- Embedding model: `text-embedding-3-large` (3072 dims) or Turkish fine-tuned
- Tables: `listing_embeddings`, `part_embeddings`, `news_embeddings`
- Index: HNSW (`m=16, ef_construction=64`)
- Used by: AI search, similar listings, recommendation engine

### 7.5 ClickHouse — Analytics

- Event stream: page views, searches, listing views, conversions
- Aggregations: DAU, funnel, market price trends, dealer performance
- Ingestion: Edge Function → Kafka → ClickHouse Materialized Views

### 7.6 Object Storage

| Bucket | Access | Content | CDN |
|--------|--------|---------|-----|
| `listing-images` | Public read | Vehicle photos | Cloudflare |
| `listing-images-processed` | Public read | Thumbnails, WebP | Cloudflare |
| `user-avatars` | Public read | Profile photos | Cloudflare |
| `documents` | Private | KYC, invoices | Signed URLs |
| `media-uploads-temp` | Private | Pre-process uploads | None |
| `exports` | Private | Dealer CSV exports | Signed URLs |

---

## 8. AI/ML Layer

See [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md) for comprehensive detail.

**Summary integration points:**

```
User Query → AI Gateway → [Router] → LLM / ML Model / Search Index
                              │
                              ├── Chat → GPT-4o / Claude (assistant)
                              ├── Valuation → XGBoost ensemble
                              ├── Search → Embedding + ES hybrid
                              ├── Vision → Damage detection, photo quality
                              └── Fraud → Anomaly scoring model
```

---

## 9. Integration Layer

### 9.1 External Services

| Service | Provider | Purpose | SLA Target |
|---------|----------|---------|------------|
| SMS OTP | Twilio / Netgsm | Phone auth | 99.9% |
| VIN Decode | NHTSA + local DB | Vehicle specs | 99.5% |
| Tramer | Turkish gov API | Accident history | 99.0% |
| Payments | iyzico | Cards, installments | 99.9% |
| Push Notifications | Firebase FCM | Mobile push | 99.5% |
| Email | Resend / SendGrid | Transactional | 99.5% |
| Maps | Google Maps / Mapbox | Location, geocoding | 99.9% |
| Image Moderation | AWS Rekognition / custom | NSFW, fraud | 99.0% |
| LLM | OpenAI / Anthropic | Assistant, generation | 99.5% |

### 9.2 Integration Pattern

```
Edge Function → Integration Adapter → External API
                      │
                      ├── Circuit Breaker (5 failures → open 30s)
                      ├── Retry (3x exponential backoff)
                      ├── Timeout (5s default, 30s for reports)
                      ├── Response Cache (Redis)
                      └── Audit Log (integration_calls table)
```

### 9.3 Webhook Inbound

| Source | Event | Handler |
|--------|-------|---------|
| iyzico | Payment success/fail | `payment-webhook` |
| Twilio | SMS delivery status | `sms-status-webhook` |
| Partner banks | Loan decision | `financing-webhook` |
| Partner insurers | Quote/bind | `insurance-webhook` |

---

## 10. Infrastructure & DevOps

### 10.1 Environment Strategy

| Environment | Purpose | Supabase | Data |
|-------------|---------|----------|------|
| `local` | Developer machines | Supabase CLI (Docker) | Seed data |
| `development` | Feature integration | Supabase project (dev) | Synthetic |
| `staging` | Pre-production QA | Supabase project (staging) | Anonymized prod subset |
| `production` | Live traffic | Supabase Pro/Enterprise | Real |

### 10.2 CI/CD Pipeline

```
┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐
│  Push   │───▶│  Lint   │───▶│  Test   │───▶│  Build  │───▶│ Deploy  │
│ (GitHub)│    │ + Type  │    │ Unit +  │    │ Edge Fn │    │ Staging │
│         │    │  Check  │    │ Integr. │    │ + Mig.  │    │         │
└─────────┘    └─────────┘    └─────────┘    └─────────┘    └────┬────┘
                                                                  │
                                                            ┌─────▼─────┐
                                                            │  Manual   │
                                                            │  Promote  │
                                                            │  → Prod   │
                                                            └───────────┘
```

**Tools:**
- **Source:** GitHub (monorepo: `otoyali-platform`)
- **CI:** GitHub Actions
- **Edge Functions:** Supabase CLI deploy
- **Migrations:** Supabase db push (reviewed PRs)
- **FlutterFlow:** Export → CI build → Fastlane deploy
- **Secrets:** GitHub Secrets → Supabase Vault

### 10.3 Infrastructure as Code

- Supabase project settings: Terraform (supabase provider)
- Cloudflare: Terraform
- Monitoring: Terraform (Grafana Cloud)

### 10.4 Branch Strategy

```
main (production)
  └── develop (staging)
        ├── feature/OTO-123-ai-search
        ├── feature/OTO-456-dealer-dashboard
        └── hotfix/OTO-789-payment-fix
```

---

## 11. Scalability Strategy (100M+ Users)

### 11.1 Growth Projections & Infrastructure Milestones

| Users | MAU | Listings | QPS (peak) | Infrastructure |
|-------|-----|----------|------------|----------------|
| 100K | 30K | 50K | 50 | Supabase Pro, single region |
| 1M | 300K | 500K | 500 | Read replicas, Redis, ES single node |
| 10M | 3M | 5M | 5,000 | ES cluster, Kafka, CDN aggressive |
| 50M | 15M | 25M | 25,000 | Service extraction, multi-region read |
| 100M | 30M | 50M | 50,000 | Full microservices, multi-region write |

### 11.2 Database Scaling

```
Phase 1: Single PostgreSQL (Supabase Pro)
    ↓
Phase 2: Read replicas (2x), connection pooling (PgBouncer)
    ↓
Phase 3: Table partitioning (listings, messages, events)
    ↓
Phase 4: Schema-per-service, listing DB separate
    ↓
Phase 5: Citus/sharding for listings, CockroachDB evaluation
```

### 11.3 Search Scaling

```
Phase 1: PostgreSQL full-text (pg_trgm)
    ↓
Phase 2: Elasticsearch single node
    ↓
Phase 3: ES 3-node cluster, dedicated master
    ↓
Phase 4: ES cross-cluster replication (Istanbul + Frankfurt)
    ↓
Phase 5: Custom search service with vector + keyword fusion
```

### 11.4 Caching Strategy

```
L1: Client cache (Hive, 5 min TTL for listings)
L2: CDN edge cache (public listing pages, 1 min)
L3: Redis application cache (15 min)
L4: PostgreSQL materialized views (search facets, 1 hr)
L5: Elasticsearch (search index, near real-time)
```

### 11.5 Multi-Region Strategy (Phase 4+)

| Region | Role | Services |
|--------|------|----------|
| eu-central (Frankfurt) | Primary write | PostgreSQL primary, all services |
| eu-west (Ireland) | Read replica | Read replicas, ES replica |
| me-south (Bahrain) | Future MENA | Read replica, CDN PoP |

Turkey users served from Frankfurt (lowest latency ~30ms Istanbul).

---

## 12. Observability

### 12.1 Three Pillars

| Pillar | Tool | Key Metrics |
|--------|------|-------------|
| **Logs** | Grafana Loki / Supabase Logs | Error rate, slow queries, auth failures |
| **Metrics** | Prometheus + Grafana | QPS, latency p50/p95/p99, cache hit rate |
| **Traces** | OpenTelemetry → Tempo | Request flow across Edge Functions |

### 12.2 SLIs & SLOs

| Service | SLI | SLO | Error Budget |
|---------|-----|-----|--------------|
| API (overall) | Availability | 99.9% | 43 min/month |
| Search | p95 latency | < 300ms | — |
| Listing detail | p95 latency | < 200ms | — |
| AI Assistant | p95 latency | < 3s | — |
| Auth (OTP) | Success rate | 99.5% | — |
| Payments | Success rate | 99.9% | — |

### 12.3 Alerting

| Severity | Condition | Response |
|----------|-----------|----------|
| P1 Critical | API down, payment failures | Page on-call, 15 min response |
| P2 High | Error rate > 1%, latency p99 > 2s | Slack alert, 1 hr response |
| P3 Medium | Cache hit rate < 80% | Ticket, next business day |
| P4 Low | Disk usage > 70% | Ticket, planned |

---

## 13. Disaster Recovery & Business Continuity

| Scenario | RTO | RPO | Strategy |
|----------|-----|-----|----------|
| Database failure | 1 hr | 5 min | Supabase PITR, read replica promotion |
| Region outage | 4 hr | 15 min | Failover to read replica region |
| Supabase outage | 2 hr | 5 min | Status page, cached CDN pages, queue writes |
| Data corruption | 24 hr | 1 hr | Point-in-time recovery |
| DDoS | 0 (automatic) | 0 | Cloudflare automatic mitigation |

**Backup Schedule:**
- PostgreSQL: Continuous WAL + daily snapshot (30 day retention)
- Storage: Cross-region replication (R2)
- Elasticsearch: Daily snapshot to S3

---

## 14. Technology Stack Summary

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Frontend | Flutter / FlutterFlow | 3.x | iOS, Android, Web |
| Backend | Supabase | Latest | Auth, DB, Storage, Edge Functions |
| Edge Functions | Deno / TypeScript | 1.x | Business logic |
| Database | PostgreSQL | 15+ | Primary data store |
| Cache | Redis (Upstash) | 7.x | Session, cache, rate limit |
| Search | Elasticsearch | 8.x | Full-text, facets, geo |
| Vector | pgvector | 0.5+ | Semantic search |
| Analytics | ClickHouse | 23.x | Event analytics |
| Queue | pg_cron → Redpanda | — | Background jobs → events |
| CDN/WAF | Cloudflare | — | Edge, security |
| AI/LLM | OpenAI + Anthropic | — | Assistant, generation |
| ML | Python (FastAPI) | 3.11 | Valuation, fraud models |
| Payments | iyzico | — | Turkey-native |
| SMS | Twilio / Netgsm | — | OTP |
| Monitoring | Grafana Cloud | — | Logs, metrics, traces |
| CI/CD | GitHub Actions | — | Pipeline |
| IaC | Terraform | 1.x | Infrastructure |

---

## Document References

| Document | Purpose |
|----------|---------|
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Data model |
| [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md) | AI/ML systems |
| [API_DESIGN.md](./API_DESIGN.md) | API contracts |
| [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) | Backend configuration |
| [SECURITY.md](./SECURITY.md) | Security framework |

---

*This architecture is designed to evolve. Every phase transition has explicit triggers based on user count, QPS, and team size.*
