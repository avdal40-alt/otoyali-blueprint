# OTOYALI — AI Architecture

**Version:** 1.0.0  
**Classification:** Internal — Engineering  
**Last Updated:** 2026-06-29  
**Owner:** AI/ML Platform Team

---

## Table of Contents

1. [AI Strategy Overview](#1-ai-strategy-overview)
2. [AI System Architecture](#2-ai-system-architecture)
3. [Otoyali AI Assistant](#3-otoyali-ai-assistant)
4. [AI Valuation Engine](#4-ai-valuation-engine)
5. [AI Search](#5-ai-search)
6. [AI Listing Generator](#6-ai-listing-generator)
7. [VIN Intelligence](#7-vin-intelligence)
8. [Fraud Detection System](#8-fraud-detection-system)
9. [Computer Vision Pipeline](#9-computer-vision-pipeline)
10. [Recommendation Engine](#10-recommendation-engine)
11. [LLM Gateway & Model Strategy](#11-llm-gateway--model-strategy)
12. [Embedding Pipeline](#12-embedding-pipeline)
13. [Training & MLOps](#13-training--mlops)
14. [Data Flywheel](#14-data-flywheel)
15. [Cost Management](#15-cost-management)
16. [Safety & Guardrails](#16-safety--guardrails)
17. [Evaluation & Metrics](#17-evaluation--metrics)

---

## 1. AI Strategy Overview

OTOYALI's competitive moat is **automotive intelligence at scale**. Every user interaction generates data that makes our AI smarter. We deploy AI not as a chatbot gimmick but as the **primary interface** for discovery, trust, and transaction.

### AI Product Map

```
┌─────────────────────────────────────────────────────────────────┐
│                     OTOYALI AI PLATFORM                          │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│  CONVERSATIONAL │  PREDICTIVE  │  PERCEPTUAL  │  DETECTIVE      │
│                 │              │              │                  │
│ • AI Assistant  │ • Valuation  │ • Photo QC   │ • Fraud Detection│
│ • NL Search     │ • Price Trend│ • Damage Det.│ • Duplicate Det. │
│ • Listing Gen   │ • Market Anal│ • OCR (VIN)  │ • Scam Patterns  │
│ • Q&A Guides    │ • Lead Score │ • Part ID    │ • Review Sentim. │
│ • Finance Guide │ • Churn Pred │ • Plate OCR  │ • Anomaly Score  │
└──────────────┴──────────────┴──────────────┴────────────────────┘
```

### Design Principles

1. **Turkish-first models** — All NLU/NLG optimized for Turkish automotive terminology
2. **Grounded responses** — AI never hallucinates prices, specs, or legal advice; always cites data sources
3. **Tool-use architecture** — LLM orchestrates, doesn't compute; calls valuation API, search API, VIN API
4. **Graceful fallback** — AI failure → traditional search/filters; never block user
5. **Privacy-preserving** — User data never sent to LLM providers for training; PII scrubbed pre-call
6. **Cost-aware routing** — Simple queries → smaller models; complex → GPT-4o/Claude

---

## 2. AI System Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CLIENT (FlutterFlow)                          │
│  Chat UI │ Search Bar │ Valuation Widget │ Photo Upload │ VIN Scanner │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────┐
│                      AI GATEWAY (Edge Function)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │   Router    │  │ Rate Limiter│  │ PII Scrubber│  │ Auth Check │  │
│  └──────┬──────┘  └─────────────┘  └─────────────┘  └────────────┘  │
└─────────┼────────────────────────────────────────────────────────────┘
          │
    ┌─────┴─────┬─────────────┬─────────────┬─────────────┐
    │           │             │             │             │
┌───▼───┐  ┌───▼───┐    ┌───▼───┐    ┌───▼───┐    ┌───▼───┐
│Assist.│  │Search │    │Valuat.│    │Vision │    │ Fraud │
│Service│  │Service│    │Service│    │Service│    │Service│
└───┬───┘  └───┬───┘    └───┬───┘    └───┬───┘    └───┬───┘
    │          │             │             │             │
┌───▼──────────▼─────────────▼─────────────▼─────────────▼───┐
│                    MODEL / DATA LAYER                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ LLM API  │ │ XGBoost  │ │ CLIP/    │ │ Isolation│      │
│  │ GPT-4o   │ │ Ensemble │ │ Custom   │ │ Forest   │      │
│  │ Claude   │ │          │ │ Vision   │ │          │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                     │
│  │ pgvector │ │Elastic-  │ │ Redis    │                     │
│  │Embeddings│ │ search   │ │ Cache    │                     │
│  └──────────┘ └──────────┘ └──────────┘                     │
└──────────────────────────────────────────────────────────────┘
```

---

## 3. Otoyali AI Assistant

### 3.1 Overview

**Name:** Otoyali AI (Turkish) / OTOYALI AI (English)  
**Personality:** Knowledgeable, friendly, honest automotive advisor — like a trusted mechanic friend  
**Channels:** In-app chat, search bar copilot, listing creation wizard

### 3.2 Capabilities

| Capability | Description | Tools Used |
|------------|-------------|------------|
| Vehicle search | "Istanbul'da 800 bin altı otomatik SUV bul" | `search_listings`, `get_filters` |
| Buying advice | "İlk araba alıyorum, nelere dikkat etmeliyim?" | `get_guide`, `compare_vehicles` |
| Valuation inquiry | "2020 Corolla 50 bin km ne eder?" | `get_valuation`, `market_trends` |
| Listing help | "İlanımı oluşturmama yardım et" | `create_listing_draft`, `generate_description` |
| VIN lookup | "Bu VIN numarasını kontrol et" | `decode_vin`, `get_vin_history` |
| Financing guide | "Kredi hesapla, aylık ne öderim?" | `calculate_financing`, `get_quotes` |
| Insurance explain | "Kasko ile trafik arasındaki fark?" | `get_insurance_info`, `get_quotes` |
| Parts fitment | "Bu parça benim arabama uyar mı?" | `check_part_fitment` |
| Comparison | "Corolla mı Civic mi?" | `compare_vehicles`, `search_listings` |

### 3.3 System Prompt Architecture

```
┌─────────────────────────────────────────┐
│           SYSTEM PROMPT LAYERS            │
├─────────────────────────────────────────┤
│ Layer 1: Identity & Persona (static)    │
│ Layer 2: Safety & Compliance (static)    │
│ Layer 3: Tool Definitions (static)       │
│ Layer 4: User Context (dynamic)          │
│   - locale, city, search history         │
│   - current listing being viewed         │
│   - saved searches, favorites            │
│ Layer 5: Conversation History (dynamic)  │
│   - last 20 messages (summarized older)  │
│ Layer 6: Retrieved Context (RAG)         │
│   - relevant listings, guides, FAQ       │
└─────────────────────────────────────────┘
```

### 3.4 Tool Definitions

```typescript
const tools = [
  {
    name: "search_listings",
    description: "Search vehicle listings with structured filters",
    parameters: {
      category: "car | motorcycle | commercial",
      make: "string?",
      model: "string?",
      year_min: "number?",
      year_max: "number?",
      price_max: "number?",
      city: "string?",
      fuel_type: "string?",
      transmission: "string?",
      query: "string? — natural language overlay"
    }
  },
  {
    name: "get_valuation",
    description: "Get AI price estimate for a vehicle",
    parameters: {
      make: "string", model: "string", year: "number",
      mileage_km: "number", condition: "string?",
      city: "string?"
    }
  },
  {
    name: "decode_vin",
    description: "Decode VIN to vehicle specifications",
    parameters: { vin: "string — 17 characters" }
  },
  {
    name: "get_vin_history",
    description: "Get accident and ownership history (paid)",
    parameters: { vin: "string", report_type: "basic | full" }
  },
  {
    name: "calculate_financing",
    description: "Calculate loan EMI and get pre-qualification",
    parameters: {
      vehicle_price: "number", down_payment: "number?",
      term_months: "number?", interest_rate: "number?"
    }
  },
  {
    name: "compare_vehicles",
    description: "Compare specs, prices, and reviews of vehicles",
    parameters: { vehicles: "array of {make, model, year}" }
  },
  {
    name: "create_listing_draft",
    description: "Start a listing creation with pre-filled data",
    parameters: { /* vehicle fields */ }
  },
  {
    name: "generate_listing_description",
    description: "Generate listing title and description from specs and photos",
    parameters: { specs: "object", photo_urls: "string[]?" }
  }
];
```

### 3.5 Conversation Flow

```
User Message
    │
    ▼
[Intent Classification] ── simple FAQ? ──▶ Cached Response (no LLM)
    │ complex
    ▼
[Context Assembly] ── user profile, current page, history, RAG
    │
    ▼
[LLM Call with Tools] ── GPT-4o / Claude Sonnet
    │
    ├── Tool Call(s) ──▶ Execute ──▶ Results back to LLM
    │
    ▼
[Response Generation] ── localized, grounded, with listing cards
    │
    ▼
[Stream to Client] ── SSE / WebSocket
```

### 3.6 Session Management

- Sessions stored in `ai.assistant_sessions` (24hr TTL)
- Anonymous users: 5 messages/session, then auth prompt
- Authenticated users: 50 messages/session, 200/day soft limit
- Conversation summarization after 20 messages (compress history)
- Session context includes current listing ID if viewing detail page

---

## 4. AI Valuation Engine

### 4.1 Overview

Real-time vehicle price estimation using ensemble ML models trained on Turkish market data.

**Target accuracy:** ±8% of actual sale price (MAPE) for cars, ±12% for motorcycles/commercial.

### 4.2 Model Architecture

```
Input Features
    │
    ├── Vehicle: make, model, year, variant, mileage, condition, fuel, transmission
    ├── Market: city, season, market_trend, inventory_count, avg_days_on_market
    ├── Listing: photo_count, description_quality, seller_type, promotion_tier
    ├── Historical: comparable_sales (last 90 days, same model, ±1 year, ±20% mileage)
    │
    ▼
┌─────────────────────────────────────────┐
│           ENSEMBLE MODEL                 │
│  ┌──────────┐  ┌──────────┐  ┌────────┐│
│  │ XGBoost  │  │ LightGBM │  │  NN    ││
│  │ (40%)    │  │ (35%)    │  │ (25%)  ││
│  └────┬─────┘  └────┬─────┘  └───┬────┘│
│       └──────────┬───┴───────────┘     │
│                  ▼                      │
│         Weighted Average + Calibration  │
└─────────────────────────────────────────┘
    │
    ▼
Output: {
  predicted_price: 850000,        // TRY kuruş
  confidence: 0.87,
  price_range: { min: 780000, max: 920000 },
  comparables: [...],             // top 5 similar sold/active
  market_trend: { direction: "down", change_pct: -2.3 },
  factors: [                       // SHAP explanations
    { factor: "mileage", impact: -45000, direction: "negative" },
    { factor: "market_demand", impact: +30000, direction: "positive" }
  ]
}
```

### 4.3 Training Data Pipeline

| Source | Data | Update Frequency |
|--------|------|------------------|
| OTOYALI sold listings | Actual sale prices | Daily |
| OTOYALI active listings | Ask prices, engagement | Hourly |
| Partner dealer data | Wholesale prices | Weekly |
| External market data | Industry reports | Monthly |
| Tramer data | Accident impact on value | Per query |

### 4.4 Valuation API

```
POST /functions/v1/ai-valuation
{
  "make_id": "uuid",
  "model_id": "uuid",
  "year": 2020,
  "mileage_km": 50000,
  "condition": "used",
  "city": "Istanbul",
  "fuel_type": "gasoline",
  "transmission": "automatic",
  "attributes": { "sunroof": true, "leather": true }
}

Response: ValuationResult (see model output above)
```

### 4.5 Valuation Display Rules

- Show price range, not single point (transparency)
- Confidence badge: High (>85%), Medium (70-85%), Low (<70%)
- "Bu fiyat tahminidir" disclaimer always visible
- Comparables shown with links to active listings
- Re-valuation triggered on: price change, 7 days stale, market shift >5%

---

## 5. AI Search

### 5.1 Hybrid Search Architecture

OTOYALI search combines three retrieval methods:

```
User Query: "kırmızı otomatik dizel SUV İstanbul 1 milyon altı"
    │
    ├─── [Path A: Structured Parse] ──────────────────────
    │    LLM extracts: { color: "red", transmission: "automatic",
    │                     fuel: "diesel", body: "suv", city: "Istanbul",
    │                     price_max: 100000000 }
    │    → PostgreSQL/ES filtered query
    │
    ├─── [Path B: Semantic Search] ───────────────────────
    │    Query → embedding (text-embedding-3-large)
    │    → pgvector cosine similarity on listing_embeddings
    │    → Top 100 candidates
    │
    └─── [Path C: Keyword Search] ──────────────────────
         Turkish analyzer tokenization
         → Elasticsearch multi_match (title, description, attributes)
         → BM25 scoring
    │
    ▼
[Reciprocal Rank Fusion (RRF)]
    score = Σ 1/(k + rank_i)  where k=60
    │
    ▼
[Re-ranker (LightGBM)]
    Features: RRF score, listing quality, seller trust, recency, promotion
    │
    ▼
[Final Results + Facets + AI Summary]
    "İstanbul'da 47 kırmızı otomatik dizel SUV bulundu. Ortalama fiyat: ₺920.000"
```

### 5.2 Search Modes

| Mode | Input | Processing |
|------|-------|------------|
| Text NL | Natural language query | LLM parse + hybrid search |
| Voice | Speech → text (Whisper) | Same as text NL |
| Photo | Vehicle image upload | CLIP embedding → visual similarity |
| VIN | 17-char VIN | Direct lookup + similar listings |
| Filter | Traditional UI filters | Direct SQL/ES query |
| Combined | NL + active filters | Merge structured + semantic |

### 5.3 Turkish NLP Considerations

- Custom Turkish automotive dictionary (5000+ terms)
- Morphological analysis for agglutinative forms ("otomatikler" → "otomatik")
- Brand/model alias mapping ("BMW" = "Bayerische", "Mercedes" = "Merc")
- Currency parsing ("1 milyon" → 1000000, "800 bin" → 800000)
- City/district normalization ("Ist." → "Istanbul", "Ank." → "Ankara")

### 5.4 Search Personalization (Phase 2)

- User embedding from search/view/favorite history
- Personalized re-ranking boost for preferred makes, price range, city
- "Sizin için" section on homepage

---

## 6. AI Listing Generator

### 6.1 Flow

```
User uploads photos + basic info (make, model, year, mileage)
    │
    ▼
[Vision Pipeline]
    ├── Photo quality check (blur, lighting, angle)
    ├── Damage detection (highlight in UI)
    ├── Color detection
    ├── Feature detection (sunroof, leather, alloy wheels)
    └── OCR: VIN from photo, plate from photo
    │
    ▼
[LLM Generation]
    Input: specs + vision results + market data
    Output:
    ├── title: "2020 Toyota Corolla 1.6 Dream Otomatik - 50.000 km"
    ├── description: 150-300 word SEO-optimized description
    ├── highlights: ["Otomatik vites", "Hatasız boyasız", "Yetkili servis bakımlı"]
    ├── suggested_price: AI valuation result
    └── tags: ["otomatik", "benzin", "sedan", "hatasiz"]
    │
    ▼
[User Review & Edit] → Publish
```

### 6.2 Description Generation Prompt Strategy

- Template-based structure: Intro → Specs → Condition → Features → Contact
- SEO keywords naturally embedded (make, model, year, city, fuel, transmission)
- Tone: factual, honest, not salesy
- Length: 150-300 words (Turkish), 120-250 words (English)
- Never claim condition not verified by photos/user input

---

## 7. VIN Intelligence

### 7.1 VIN Decode Pipeline

```
VIN Input (17 chars)
    │
    ▼
[Validation] ── ISO 3779 check digit, format validation
    │
    ├── Cache Hit (integration.vin_cache) ──▶ Return cached
    │
    ▼
[Multi-Source Decode]
    ├── NHTSA API (international vehicles)
    ├── Local Turkish DB (domestic assembly)
    └── Manual override table (community corrections)
    │
    ▼
[Enrichment]
    ├── Map to marketplace.vehicle_makes/models/variants
    ├── Standard equipment lookup
    └── Recall check (future)
    │
    ▼
Store in marketplace.vin_records + return
```

### 7.2 VIN History (Tramer Integration)

```
VIN + User Auth + Payment (for full report)
    │
    ▼
[Tramer API Call] ── circuit breaker, 30-day cache
    │
    ▼
[Report Assembly]
    ├── Ownership history (count, dates)
    ├── Accident records (date, severity, parts)
    ├── Mileage timeline (odometer readings)
    ├── Lien/encumbrance check
    ├── Flood/salvage flags
    └── Insurance claim history
    │
    ▼
[AI Summary] ── LLM generates human-readable Turkish summary
    "Bu araç 2 kez el değiştirmiş. 2022'de hafif ön tampon hasarı kaydı var.
     Kilometre kayıtları tutarlı görünüyor."
    │
    ▼
Store in marketplace.vin_history_reports
```

### 7.3 VIN OCR

- On-device ML Kit (Flutter) for real-time VIN scanning
- Cloud fallback: Google Vision API for dashboard/door jamb photos
- Validation before API call to save costs

---

## 8. Fraud Detection System

### 8.1 Signal Categories

| Category | Signals | Weight |
|----------|---------|--------|
| **Price anomaly** | Price vs AI valuation deviation >30% | High |
| **Photo fraud** | Stock photos, reverse image match, AI-generated | High |
| **Duplicate listing** | Same VIN/photos on multiple accounts | Critical |
| **Seller behavior** | New account + high-value listing, VPN usage | Medium |
| **Description** | Copy-paste across listings, contact info in text | Medium |
| **Messaging** | Payment outside platform, urgency tactics | High |
| **Velocity** | >10 listings/day from individual account | Medium |
| **Device fingerprint** | Multiple accounts same device | High |

### 8.2 Scoring Pipeline

```
Event (listing created/updated, message sent, login)
    │
    ▼
[Feature Extraction] ── real-time from event + historical lookup
    │
    ▼
[Anomaly Model] ── Isolation Forest + Rule Engine
    │
    ├── Score < 0.3 ──▶ Auto-approve
    ├── Score 0.3-0.7 ──▶ Flag for review queue
    └── Score > 0.7 ──▶ Auto-hold + notify moderation team
    │
    ▼
Store in ai.fraud_scores + trigger moderation workflow
```

### 8.3 Moderation Queue

- Admin dashboard: flagged items sorted by score
- One-click actions: approve, reject, ban user, request verification
- Feedback loop: moderator decisions → model retraining labels

---

## 9. Computer Vision Pipeline

### 9.1 Photo Processing Flow

```
Upload → Supabase Storage (listing-images-temp)
    │
    ▼
[Edge Function: media-process] ── triggered on upload
    │
    ├── Resize: 1200px max width, WebP conversion
    ├── Thumbnail: 400px, 150px
    ├── Watermark: OTOYALI logo (bottom-right, 10% opacity)
    ├── Quality check: blur score, brightness, resolution
    ├── NSFW check: AWS Rekognition
    ├── Damage detection: Custom model (scratches, dents, rust)
    ├── Feature detection: sunroof, wheels, interior material
    ├── Duplicate check: perceptual hash vs existing listings
    └── OCR: VIN, plate number extraction
    │
    ▼
Move to listing-images-processed → Update listing_images record
```

### 9.2 Models

| Task | Model | Deployment | Latency |
|------|-------|------------|---------|
| Quality check | Custom CNN (MobileNet backbone) | Edge Function (ONNX) | <500ms |
| Damage detection | Custom YOLOv8 | GPU worker | <2s |
| Feature detection | CLIP fine-tuned | GPU worker | <1s |
| NSFW | AWS Rekognition | API call | <1s |
| OCR (VIN) | Google ML Kit + custom | On-device + cloud | <500ms |
| Duplicate detection | pHash + embedding similarity | Edge Function | <200ms |

---

## 10. Recommendation Engine

### 10.1 Recommendation Types

| Type | Algorithm | Surface |
|------|-----------|---------|
| Similar listings | Embedding cosine similarity | Listing detail page |
| Personalized feed | Collaborative filtering + content-based | Homepage |
| "You might also like" | Session-based + historical | Search results |
| Price alert matches | Saved search filter match | Push notification |
| Cross-sell parts | VIN fitment + purchase history | Listing detail, post-purchase |
| Dealer recommendations | Lead scoring + inventory match | Dealer dashboard |

### 10.2 Similar Listings Algorithm

```
Current Listing Embedding
    │
    ▼
pgvector: SELECT * FROM ai.listing_embeddings
    ORDER BY embedding <=> $current_embedding
    LIMIT 20
    │
    ▼
Filter: same category, status=active, price ±30%, same city (or national)
    │
    ▼
Re-rank: boost by recency, seller trust, photo quality
    │
    ▼
Return top 6 with "Benzer İlanlar" section
```

---

## 11. LLM Gateway & Model Strategy

### 11.1 Model Routing

| Use Case | Primary Model | Fallback | Max Tokens |
|----------|--------------|----------|------------|
| Assistant chat | GPT-4o | Claude 3.5 Sonnet | 4096 |
| Search parse | GPT-4o-mini | GPT-4o | 1024 |
| Listing generation | GPT-4o | Claude 3.5 Sonnet | 2048 |
| VIN summary | GPT-4o-mini | — | 1024 |
| Translation EN↔TR | GPT-4o-mini | — | 2048 |
| Sentiment analysis | GPT-4o-mini | — | 512 |
| Simple FAQ | Cached / GPT-4o-mini | — | 256 |

### 11.2 LLM Gateway Features

```typescript
interface LLMGateway {
  // Route to optimal model based on task complexity
  route(request: LLMRequest): ModelSelection;

  // PII scrubbing before external API call
  scrubPII(text: string): ScrubbedText;

  // Response caching (identical queries)
  cache: RedisCache; // TTL: 1hr FAQ, 5min search

  // Cost tracking per user/session
  trackUsage(userId: string, tokens: number, model: string): void;

  // Circuit breaker per provider
  circuitBreaker: { openai: CB, anthropic: CB };

  // Streaming support
  stream(request: LLMRequest): AsyncIterable<string>;
}
```

### 11.3 Provider Configuration

| Provider | Use | Data Processing Agreement |
|----------|-----|--------------------------|
| OpenAI | Primary LLM | Zero retention, no training |
| Anthropic | Fallback LLM | Zero retention, no training |
| Self-hosted (future) | Simple tasks, cost reduction | Full control |

---

## 12. Embedding Pipeline

### 12.1 Embedding Generation

```
Trigger: Listing published/updated, Article published
    │
    ▼
[Text Assembly]
    listing: "{title}. {description}. {make} {model} {year}. {city}. {attributes}"
    part: "{title}. {description}. {oem_number}. {compatible_models}"
    article: "{title}. {excerpt}. {body_first_500_chars}"
    │
    ▼
[Embedding Model] ── text-embedding-3-large (3072 dims)
    │
    ▼
[Store] ── ai.listing_embeddings / ai.part_embeddings / ai.article_embeddings
    │
    ▼
[Index] ── HNSW index auto-updated
```

### 12.2 Batch Re-embedding

- Triggered on model version upgrade
- pg_cron job: process 1000/hour to avoid API rate limits
- Blue-green index swap for zero-downtime migration

---

## 13. Training & MLOps

### 13.1 Infrastructure

| Component | Tool | Purpose |
|-----------|------|---------|
| Experiment tracking | MLflow | Model versions, metrics |
| Feature store | PostgreSQL materialized views → Feast (scale) | Training features |
| Training | Python + scikit-learn/XGBoost/PyTorch | Model training |
| Serving | Supabase Edge Functions (ONNX) + FastAPI (GPU) | Inference |
| Monitoring | Evidently AI | Data drift, model drift |
| Pipeline orchestration | pg_cron → GitHub Actions (scale: Airflow) | Scheduled retraining |

### 13.2 Retraining Schedule

| Model | Frequency | Trigger |
|-------|-----------|---------|
| Valuation (cars) | Weekly | + data drift > threshold |
| Valuation (motorcycle/commercial) | Bi-weekly | + new data > 1000 samples |
| Fraud detection | Daily | + new labeled data |
| Search re-ranker | Weekly | + click-through data |
| Photo quality | Monthly | + new labeled photos |
| Recommendation | Weekly | + engagement metrics |

### 13.3 Model Deployment Pipeline

```
Training Complete (MLflow)
    │
    ▼
[Validation Gate]
    ├── Offline metrics ≥ current production
    ├── A/B test setup (5% traffic)
    └── Latency benchmark < SLA
    │
    ▼
[Canary Deploy] ── 5% → 25% → 50% → 100% (24hr each stage)
    │
    ▼
[Monitor] ── error rate, latency, business metrics
    │
    ├── Regression? ──▶ Auto-rollback
    └── Success ──▶ Promote to production
```

---

## 14. Data Flywheel

```
More Users → More Listings → More Sale Data → Better Valuations
     ↑                                              │
     │                                              ▼
More Trust ← Better Fraud Detection ← More Interactions
     ↑                                              │
     │                                              ▼
More Transactions ← Better Recommendations ← Better Search
     ↑                                              │
     │                                              ▼
More Partners ← Better Analytics ← More Market Data
```

**Key metrics for flywheel health:**
- Valuation accuracy trend (MAPE over time)
- Search click-through rate
- AI assistant resolution rate (queries resolved without human)
- Fraud detection precision/recall
- Recommendation click-through rate

---

## 15. Cost Management

### 15.1 Estimated AI Costs at Scale

| Component | Cost at 1M MAU | Cost at 10M MAU | Optimization |
|-----------|---------------|-----------------|--------------|
| LLM (Assistant) | $15K/mo | $80K/mo | Model routing, caching, self-hosted |
| LLM (Generation) | $5K/mo | $25K/mo | Template + LLM hybrid |
| Embeddings | $2K/mo | $10K/mo | Batch processing, smaller model |
| Vision API | $3K/mo | $15K/mo | On-device where possible |
| ML Inference | $1K/mo | $5K/mo | ONNX on Edge Functions |
| **Total** | **~$26K/mo** | **~$135K/mo** | Target: <$0.01/MAU |

### 15.2 Cost Controls

- Per-user daily token budget (authenticated: 50K tokens/day)
- Cache aggressively (FAQ: 24hr, search parse: 5min, valuation: 1hr)
- Route simple queries to GPT-4o-mini ($0.15/1M tokens vs $2.50/1M)
- Batch embedding generation during off-peak
- Self-hosted models for high-volume, low-complexity tasks (Phase 3)

---

## 16. Safety & Guardrails

### 16.1 Content Safety

| Check | Method | Action |
|-------|--------|--------|
| Harmful content | OpenAI Moderation API | Block + log |
| PII leakage | Regex + NER pre/post LLM | Scrub |
| Price manipulation | Valuation bounds check | Warn user |
| Legal advice | System prompt restriction | Redirect to professional |
| Competitor mentions | Soft redirect to OTOYALI features | Gentle redirect |
| Off-topic | Intent classifier | "Ben otomotiv asistanıyım" |

### 16.2 Response Grounding

- All price mentions MUST come from valuation API (never LLM-generated prices)
- All listing mentions MUST come from search API (never hallucinated listings)
- VIN data MUST come from decode/history API
- Legal/regulatory info MUST cite official sources
- System prompt explicitly prohibits fabrication

### 16.3 Audit Trail

Every AI interaction logged:
- Input (scrubbed), output, model, tokens, latency, tools called
- Retained 1 year for compliance and model improvement
- User can request deletion (KVKK right to erasure)

---

## 17. Evaluation & Metrics

### 17.1 Model Metrics

| Model | Primary Metric | Target | Alert Threshold |
|-------|---------------|--------|-----------------|
| Valuation | MAPE | <8% | >10% |
| Search | NDCG@10 | >0.75 | <0.65 |
| Search | Zero-result rate | <5% | >10% |
| Assistant | Resolution rate | >70% | <60% |
| Assistant | User satisfaction (thumbs) | >80% positive | <70% |
| Fraud | Precision | >90% | <85% |
| Fraud | Recall | >80% | <70% |
| Photo QC | Accuracy | >95% | <90% |
| Recommendations | CTR | >5% | <3% |

### 17.2 A/B Testing Framework

- Feature flags via `metadata` in user profile or PostHog
- Standard experiment: 50/50 split, minimum 1000 users per variant
- Primary metric per experiment defined upfront
- Auto-stop on statistically significant negative impact (p<0.05)

### 17.3 Human Evaluation

- Weekly review: 100 random assistant conversations
- Monthly review: 50 valuation accuracy checks against actual sales
- Quarterly: comprehensive search quality audit (Turkish + English)

---

## Document References

| Document | Purpose |
|----------|---------|
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | Platform architecture |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | AI-related tables |
| [API_DESIGN.md](./API_DESIGN.md) | AI API endpoints |
| [SECURITY.md](./SECURITY.md) | AI data privacy |

---

*AI is the core competitive advantage of OTOYALI. This architecture is designed to improve with every user interaction.*
