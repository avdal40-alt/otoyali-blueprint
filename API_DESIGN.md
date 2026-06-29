# OTOYALI — API Design

**Version:** 1.0.0  
**Classification:** Internal — Engineering  
**Last Updated:** 2026-06-29  
**Owner:** Platform API Team  
**Base URL:** `https://api.otoyali.com`

---

## Table of Contents

1. [API Overview](#1-api-overview)
2. [Authentication](#2-authentication)
3. [Common Conventions](#3-common-conventions)
4. [Error Handling](#4-error-handling)
5. [Rate Limiting](#5-rate-limiting)
6. [Supabase PostgREST API](#6-supabase-postgrest-api)
7. [Edge Functions API](#7-edge-functions-api)
8. [Partner API](#8-partner-api)
9. [Webhooks (Outbound)](#9-webhooks-outbound)
10. [Realtime API](#10-realtime-api)
11. [Storage API](#11-storage-api)
12. [OpenAPI Specification](#12-openapi-specification)
13. [SDK & Client Libraries](#13-sdk--client-libraries)
14. [Versioning Strategy](#14-versioning-strategy)

---

## 1. API Overview

OTOYALI exposes three API surfaces:

| Surface | Base Path | Auth | Use Case |
|---------|-----------|------|----------|
| **PostgREST** | `/rest/v1/` | JWT (Supabase) | CRUD on tables (RLS-protected) |
| **Edge Functions** | `/functions/v1/` | JWT / API Key | Business logic, AI, integrations |
| **Partner API** | `/api/v1/partner/` | API Key | External partner integrations |

Additionally:
- **Auth API:** `/auth/v1/` (Supabase managed)
- **Realtime API:** `/realtime/v1/` (Supabase WebSocket)
- **Storage API:** `/storage/v1/` (Supabase Storage)

### Architecture Diagram

```
Client Request
    │
    ▼
Cloudflare (CDN, WAF, Rate Limit)
    │
    ▼
API Gateway
    │
    ├── /auth/v1/*        → Supabase Auth
    ├── /rest/v1/*        → PostgREST (auto-generated from schema)
    ├── /functions/v1/*   → Edge Functions (custom business logic)
    ├── /realtime/v1/*    → Supabase Realtime (WebSocket)
    ├── /storage/v1/*     → Supabase Storage
    └── /api/v1/partner/* → Edge Functions (partner auth)
```

---

## 2. Authentication

### 2.1 Phone OTP Flow

```
Step 1: Request OTP
POST /auth/v1/otp
{
  "phone": "+905551234567"
}

Response 200:
{
  "message": "OTP sent",
  "message_id": "uuid"
}

Step 2: Verify OTP
POST /auth/v1/verify
{
  "phone": "+905551234567",
  "token": "123456",
  "type": "sms"
}

Response 200:
{
  "access_token": "eyJhbG...",
  "refresh_token": "xyz...",
  "expires_in": 3600,
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "phone": "+905551234567",
    "created_at": "2026-06-29T12:00:00Z"
  }
}
```

### 2.2 JWT Structure

```json
{
  "sub": "user-uuid",
  "role": "authenticated",
  "aal": "aal1",
  "phone": "+905551234567",
  "app_metadata": {
    "user_type": "individual",
    "dealer_id": null
  },
  "user_metadata": {
    "display_name": "Ahmet Y.",
    "locale": "tr-TR"
  },
  "iat": 1719669600,
  "exp": 1719673200
}
```

### 2.3 Authorization Header

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.4 Partner API Key

```
X-API-Key: otoyali_pk_live_abc123...
X-API-Secret: otoyali_sk_live_xyz789... (server-side only)
```

### 2.5 Token Refresh

```
POST /auth/v1/token?grant_type=refresh_token
{
  "refresh_token": "xyz..."
}
```

---

## 3. Common Conventions

### 3.1 Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes (authenticated) | Bearer JWT |
| `Content-Type` | Yes (POST/PATCH) | `application/json` |
| `Accept-Language` | No | `tr-TR` (default) or `en-US` |
| `X-Client-Platform` | No | `ios`, `android`, `web` |
| `X-Client-Version` | No | App version string |
| `X-Request-ID` | No | Client-generated UUID for tracing |
| `X-Idempotency-Key` | Payments | UUID for payment deduplication |

### 3.2 Response Envelope (Edge Functions)

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "uuid",
    "timestamp": "2026-06-29T12:00:00Z",
    "locale": "tr-TR"
  }
}
```

Paginated responses:

```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "request_id": "uuid",
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 1547,
      "total_pages": 78,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

### 3.3 Naming Conventions

- JSON fields: `snake_case`
- URL paths: `kebab-case`
- Query parameters: `snake_case`
- Enum values: `snake_case`
- Dates: ISO 8601 UTC (`2026-06-29T12:00:00Z`)
- Money: Integer in kuruş (1 TRY = 100 kuruş), field suffix `_amount`
- UUIDs: v7 (time-sortable)

### 3.4 Pagination

| Parameter | Default | Max | Description |
|-----------|---------|-----|-------------|
| `page` | 1 | — | Page number (1-indexed) |
| `per_page` | 20 | 100 | Items per page |
| `cursor` | — | — | Cursor-based (for realtime feeds) |

PostgREST native:
```
GET /rest/v1/listings?limit=20&offset=40&order=created_at.desc
```

Edge Functions:
```
GET /functions/v1/listing-search?page=3&per_page=20
```

---

## 4. Error Handling

### 4.1 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Geçersiz istek parametreleri",
    "message_en": "Invalid request parameters",
    "details": [
      {
        "field": "price_amount",
        "code": "MIN_VALUE",
        "message": "Fiyat 0'dan büyük olmalıdır"
      }
    ],
    "request_id": "uuid"
  }
}
```

### 4.2 Error Codes

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid input |
| 400 | `INVALID_VIN` | VIN format/checksum invalid |
| 401 | `UNAUTHORIZED` | Missing or invalid token |
| 401 | `TOKEN_EXPIRED` | JWT expired, refresh needed |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 403 | `ACCOUNT_SUSPENDED` | User account suspended |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `DUPLICATE` | Resource already exists |
| 409 | `LISTING_LIMIT_REACHED` | User listing quota exceeded |
| 422 | `BUSINESS_RULE_VIOLATION` | Valid input but business rule failed |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Server error |
| 502 | `UPSTREAM_ERROR` | External service failure |
| 503 | `SERVICE_UNAVAILABLE` | Maintenance or overload |

### 4.3 Localized Error Messages

All user-facing error messages returned in request locale (`Accept-Language`):
- `tr-TR`: Turkish message in `message` field
- `en-US`: English message in `message_en` field (or `message` if English requested)

---

## 5. Rate Limiting

### 5.1 Response Headers

```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 287
X-RateLimit-Reset: 1719673260
Retry-After: 45  (only on 429)
```

### 5.2 Limits by Endpoint Category

| Category | Anonymous | Authenticated | Dealer | Partner |
|----------|-----------|---------------|--------|---------|
| General API | 60/min | 300/min | 1000/min | 5000/min |
| Auth (OTP) | 3/min per phone | — | — | — |
| AI Assistant | — | 20/min | 50/min | — |
| AI Valuation | 5/min | 30/min | 100/min | 500/min |
| AI Search | 10/min | 60/min | 200/min | — |
| VIN Decode | 10/min | 30/min | 100/min | 500/min |
| VIN History | — | 5/min | 20/min | 50/min |
| Listing Create | — | 10/hr | 100/hr | 500/hr |
| Payment | — | 10/min | 30/min | — |
| File Upload | — | 30/min | 60/min | — |

---

## 6. Supabase PostgREST API

Auto-generated REST API from PostgreSQL schema. Protected by RLS.

### 6.1 Profiles

```
GET    /rest/v1/profiles?id=eq.{user_id}         — Get own profile
PATCH  /rest/v1/profiles?id=eq.{user_id}         — Update own profile
GET    /rest/v1/profiles?id=eq.{other_id}         — Get public profile (limited fields)
```

### 6.2 Listings

```
GET    /rest/v1/listings?status=eq.active&category=eq.car&order=created_at.desc&limit=20
GET    /rest/v1/listings?id=eq.{listing_id}
POST   /rest/v1/listings                                    — Create (draft)
PATCH  /rest/v1/listings?id=eq.{listing_id}                 — Update own
DELETE /rest/v1/listings?id=eq.{listing_id}                 — Soft delete own

# Filters (PostgREST operators)
?make_id=eq.{uuid}
&model_id=eq.{uuid}
&year=gte.2018&year=lte.2024
&price_amount=gte.50000000&price_amount=lte.100000000
&city=eq.Istanbul
&fuel_type=eq.gasoline
&transmission=eq.automatic
&status=eq.active
&order=price_amount.asc
&limit=20&offset=0

# Select related data
?select=*,make:vehicle_makes(name,logo_url),model:vehicle_models(name),seller:profiles(display_name,avatar_url,city)

# Full-text search
?search_vector=fts(turkish).otomatik suv
```

### 6.3 Favorites

```
GET    /rest/v1/listing_favorites?user_id=eq.{user_id}
POST   /rest/v1/listing_favorites                             — Add favorite
DELETE /rest/v1/listing_favorites?user_id=eq.{uid}&listing_id=eq.{lid}
```

### 6.4 Saved Searches

```
GET    /rest/v1/saved_searches?user_id=eq.{user_id}
POST   /rest/v1/saved_searches
PATCH  /rest/v1/saved_searches?id=eq.{search_id}
DELETE /rest/v1/saved_searches?id=eq.{search_id}
```

### 6.5 Vehicle Reference Data

```
GET    /rest/v1/vehicle_makes?category=eq.car&is_active=eq.true&order=sort_order
GET    /rest/v1/vehicle_models?make_id=eq.{make_id}&is_active=eq.true
GET    /rest/v1/vehicle_variants?model_id=eq.{model_id}
```

### 6.6 Reviews

```
GET    /rest/v1/reviews?reviewee_id=eq.{user_id}&order=created_at.desc
POST   /rest/v1/reviews
PATCH  /rest/v1/reviews?id=eq.{review_id}                     — Add response (reviewee)
```

### 6.7 News / Articles

```
GET    /rest/v1/articles?status=eq.published&locale=eq.tr-TR&order=published_at.desc&limit=20
GET    /rest/v1/articles?slug=eq.{slug}
GET    /rest/v1/categories?order=sort_order
```

---

## 7. Edge Functions API

Custom business logic endpoints. All return standard envelope.

### 7.1 Listings

#### Create Listing (Full Pipeline)

```
POST /functions/v1/listing-create
Authorization: Bearer {jwt}

{
  "category": "car",
  "title": "2020 Toyota Corolla 1.6 Dream",
  "description": "...",
  "price_amount": 85000000,
  "make_id": "uuid",
  "model_id": "uuid",
  "year": 2020,
  "mileage_km": 50000,
  "fuel_type": "gasoline",
  "transmission": "automatic",
  "condition": "used",
  "city": "Istanbul",
  "district": "Kadıköy",
  "location": { "lat": 40.9906, "lng": 29.0257 },
  "vin": "JTDBT923000123456",
  "attributes": {
    "sunroof": true,
    "leather_seats": true,
    "parking_sensors": true
  },
  "images": [
    { "storage_path": "temp/uuid/photo1.jpg", "sort_order": 0, "is_cover": true },
    { "storage_path": "temp/uuid/photo2.jpg", "sort_order": 1 }
  ],
  "publish": true
}

Response 201:
{
  "success": true,
  "data": {
    "listing": { ... full listing object ... },
    "ai_valuation": {
      "predicted_amount": 82000000,
      "confidence": 0.85,
      "price_range": { "min": 76000000, "max": 88000000 }
    },
    "promotion_suggestions": [
      { "tier": "premium", "price_amount": 19900, "estimated_views_increase": "5x" }
    ]
  }
}
```

#### Publish Listing

```
POST /functions/v1/listing-publish
{ "listing_id": "uuid" }
```

#### Search Listings (Hybrid)

```
GET /functions/v1/listing-search?q=kirmizi+otomatik+suv+istanbul&category=car&price_max=100000000&page=1&per_page=20

POST /functions/v1/listing-search
{
  "query": "kırmızı otomatik SUV İstanbul 1 milyon altı",
  "category": "car",
  "filters": {
    "price_max": 100000000,
    "city": "Istanbul"
  },
  "sort": "relevance",
  "page": 1,
  "per_page": 20,
  "include_facets": true
}

Response 200:
{
  "success": true,
  "data": {
    "listings": [ ... ],
    "facets": {
      "make": [{ "value": "Toyota", "count": 45 }, ...],
      "fuel_type": [{ "value": "gasoline", "count": 120 }, ...],
      "price_range": { "min": 35000000, "max": 98000000, "avg": 72000000 }
    },
    "ai_summary": "İstanbul'da 47 kırmızı otomatik SUV bulundu. Ortalama fiyat: ₺920.000",
    "suggestions": ["BMW X1 otomatik", "Hyundai Tucson otomatik"]
  },
  "meta": { "pagination": { ... } }
}
```

### 7.2 AI Services

#### AI Assistant Chat

```
POST /functions/v1/ai-assistant
Authorization: Bearer {jwt}

{
  "session_id": "uuid-or-null-for-new",
  "message": "İstanbul'da 800 bin altı otomatik araba önerir misin?",
  "context": {
    "current_listing_id": null,
    "current_page": "home"
  }
}

Response 200 (streaming via SSE):
{
  "success": true,
  "data": {
    "session_id": "uuid",
    "message": {
      "role": "assistant",
      "content": "İstanbul'da 800.000 TL altında otomatik vitesli birçok güzel seçenek var. İşte en popüler 5 ilan:",
      "listings": [ ... embedded listing cards ... ],
      "suggestions": ["Finansman seçeneklerini göster", "SUV modellerine bak"]
    }
  }
}

# SSE Stream endpoint for real-time response
GET /functions/v1/ai-assistant/stream?session_id={uuid}
Accept: text/event-stream
```

#### AI Valuation

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
  "attributes": { "sunroof": true }
}

Response 200:
{
  "success": true,
  "data": {
    "predicted_amount": 85000000,
    "confidence": 0.87,
    "price_range": { "min": 78000000, "max": 92000000 },
    "comparables": [
      {
        "listing_id": "uuid",
        "title": "2020 Toyota Corolla 1.6",
        "price_amount": 83000000,
        "mileage_km": 48000,
        "city": "Istanbul",
        "similarity_score": 0.95
      }
    ],
    "market_trend": {
      "direction": "down",
      "change_pct": -2.3,
      "period": "30d"
    },
    "factors": [
      { "factor": "mileage", "impact": -4500000, "direction": "negative" },
      { "factor": "market_demand", "impact": 3000000, "direction": "positive" }
    ],
    "disclaimer": "Bu fiyat tahminidir ve garanti niteliği taşımaz."
  }
}
```

#### AI Listing Generator

```
POST /functions/v1/ai-listing-generate

{
  "make_id": "uuid",
  "model_id": "uuid",
  "year": 2020,
  "mileage_km": 50000,
  "condition": "used",
  "fuel_type": "gasoline",
  "transmission": "automatic",
  "city": "Istanbul",
  "image_urls": ["https://storage.../photo1.jpg"],
  "locale": "tr-TR"
}

Response 200:
{
  "success": true,
  "data": {
    "title": "2020 Toyota Corolla 1.6 Dream Otomatik - 50.000 km",
    "description": "2020 model Toyota Corolla 1.6 Dream...",
    "highlights": ["Otomatik vites", "Hatasız boyasız", "Yetkili servis bakımlı"],
    "suggested_price_amount": 85000000,
    "detected_features": ["sunroof", "alloy_wheels", "parking_sensors"],
    "detected_color": "white",
    "tags": ["otomatik", "benzin", "sedan", "hatasiz"]
  }
}
```

### 7.3 VIN Services

#### VIN Decode

```
GET /functions/v1/vin-decode?vin=JTDBT923000123456

Response 200:
{
  "success": true,
  "data": {
    "vin": "JTDBT923000123456",
    "valid": true,
    "make": "Toyota",
    "model": "Corolla",
    "year": 2020,
    "engine": "1.6L 4-Cyl",
    "fuel_type": "gasoline",
    "body_type": "sedan",
    "country_of_origin": "TR",
    "make_id": "uuid",
    "model_id": "uuid",
    "variant_id": "uuid"
  }
}
```

#### VIN History Report

```
POST /functions/v1/vin-history
Authorization: Bearer {jwt}

{
  "vin": "JTDBT923000123456",
  "report_type": "full",
  "listing_id": "uuid"
}

Response 200:
{
  "success": true,
  "data": {
    "report_id": "uuid",
    "vin": "JTDBT923000123456",
    "report_type": "full",
    "status": "completed",
    "summary": "Bu araç 2 kez el değiştirmiş. 2022'de hafif ön tampon hasarı kaydı var.",
    "ownership_count": 2,
    "accident_count": 1,
    "has_lien": false,
    "has_flood_damage": false,
    "mileage_records": [
      { "date": "2022-06-15", "mileage_km": 35000, "source": "tramer" },
      { "date": "2024-01-10", "mileage_km": 50000, "source": "tramer" }
    ],
    "accidents": [
      {
        "date": "2022-03-20",
        "severity": "minor",
        "parts_affected": ["front_bumper"],
        "repair_cost_amount": 1500000
      }
    ],
    "ownership_history": [
      { "owner_type": "individual", "from": "2020-01", "to": "2022-06" },
      { "owner_type": "individual", "from": "2022-06", "to": null }
    ],
    "expires_at": "2026-09-29T12:00:00Z"
  }
}
```

### 7.4 Commerce

#### Purchase Paid Listing Promotion

```
POST /functions/v1/paid-listing-purchase
Authorization: Bearer {jwt}
X-Idempotency-Key: {uuid}

{
  "listing_id": "uuid",
  "package_slug": "premium-7d",
  "payment_method_id": "uuid"
}

Response 200:
{
  "success": true,
  "data": {
    "promotion": {
      "id": "uuid",
      "tier": "premium",
      "starts_at": "2026-06-29T12:00:00Z",
      "expires_at": "2026-07-06T12:00:00Z"
    },
    "payment": {
      "id": "uuid",
      "amount": 19900,
      "status": "completed"
    }
  }
}
```

#### Get Promotion Packages

```
GET /functions/v1/paid-listing-packages?locale=tr-TR

Response 200:
{
  "success": true,
  "data": [
    {
      "slug": "standard-3d",
      "name": "Standart Öne Çıkar",
      "tier": "standard",
      "duration_days": 3,
      "price_amount": 9900,
      "features": ["Arama sonuçlarında üst sıra", "2x daha fazla görüntülenme"]
    },
    {
      "slug": "premium-7d",
      "name": "Premium Vitrin",
      "tier": "premium",
      "duration_days": 7,
      "price_amount": 19900,
      "features": ["Ana sayfa vitrini", "5x daha fazla görüntülenme", "Premium rozeti"]
    }
  ]
}
```

### 7.5 Financial Services

#### Financing Calculator

```
POST /functions/v1/financing-calculate

{
  "vehicle_price_amount": 85000000,
  "down_payment_amount": 20000000,
  "term_months": 36,
  "listing_id": "uuid"
}

Response 200:
{
  "success": true,
  "data": {
    "loan_amount": 65000000,
    "term_months": 36,
    "quotes": [
      {
        "partner_name": "Bank A",
        "interest_rate": 3.49,
        "monthly_payment_amount": 1950000,
        "total_payment_amount": 70200000,
        "logo_url": "..."
      }
    ]
  }
}
```

#### Insurance Quotes

```
POST /functions/v1/insurance-quote
Authorization: Bearer {jwt}

{
  "insurance_type": "kasko",
  "vehicle_data": {
    "make_id": "uuid",
    "model_id": "uuid",
    "year": 2020,
    "vin": "JTDBT923000123456"
  },
  "listing_id": "uuid"
}

Response 200:
{
  "success": true,
  "data": {
    "quotes": [
      {
        "partner_name": "Insurer A",
        "insurance_type": "kasko",
        "premium_amount": 2500000,
        "premium_monthly_amount": 208333,
        "coverage_details": { ... },
        "valid_until": "2026-07-29T12:00:00Z"
      }
    ]
  }
}
```

### 7.6 Messaging

#### Start Conversation

```
POST /functions/v1/conversation-start
Authorization: Bearer {jwt}

{
  "listing_id": "uuid",
  "message": "Merhaba, araç hala satılık mı?"
}

Response 201:
{
  "success": true,
  "data": {
    "conversation_id": "uuid",
    "message_id": "uuid"
  }
}
```

#### Send Message

```
POST /functions/v1/message-send
Authorization: Bearer {jwt}

{
  "conversation_id": "uuid",
  "content": "Evet, hala satılık. Gelip görebilirsiniz.",
  "message_type": "text"
}
```

### 7.7 Dealer

#### Bulk Upload Listings

```
POST /functions/v1/dealer-bulk-upload
Authorization: Bearer {jwt}
Content-Type: multipart/form-data

file: inventory.csv

Response 202:
{
  "success": true,
  "data": {
    "job_id": "uuid",
    "status": "processing",
    "total_rows": 150,
    "estimated_completion": "2026-06-29T12:05:00Z"
  }
}
```

#### Dealer Analytics

```
GET /functions/v1/dealer-analytics?period=30d
Authorization: Bearer {jwt}

Response 200:
{
  "success": true,
  "data": {
    "total_listings": 85,
    "active_listings": 72,
    "total_views": 15420,
    "total_inquiries": 342,
    "conversion_rate": 2.22,
    "top_performing": [ ... ],
    "views_by_day": [ ... ]
  }
}
```

---

## 8. Partner API

External partner integration API. Requires API key registration.

### 8.1 Authentication

```
Headers:
  X-API-Key: otoyali_pk_live_abc123
  X-API-Secret: otoyali_sk_live_xyz789
  X-Partner-ID: partner-uuid
```

### 8.2 Endpoints

```
# Listings (read-only for partners)
GET  /api/v1/partner/listings?category=car&city=Istanbul&updated_since=2026-06-01

# Valuation
POST /api/v1/partner/valuation
{ "make": "Toyota", "model": "Corolla", "year": 2020, "mileage_km": 50000 }

# VIN
GET  /api/v1/partner/vin/{vin}/decode
GET  /api/v1/partner/vin/{vin}/history

# Market Data
GET  /api/v1/partner/market/trends?make=Toyota&model=Corolla&period=90d

# Webhook Registration
POST /api/v1/partner/webhooks
{ "url": "https://partner.com/webhook", "events": ["listing.created", "listing.sold"] }
```

---

## 9. Webhooks (Outbound)

OTOYALI sends webhook events to registered partner URLs.

### 9.1 Event Types

| Event | Trigger |
|-------|---------|
| `listing.created` | New listing published |
| `listing.updated` | Listing modified |
| `listing.sold` | Listing marked sold |
| `listing.expired` | Listing expired |
| `inquiry.received` | New buyer inquiry |
| `payment.completed` | Payment successful |
| `valuation.completed` | Valuation request processed |

### 9.2 Payload Format

```json
{
  "event": "listing.created",
  "timestamp": "2026-06-29T12:00:00Z",
  "data": { ... event-specific payload ... },
  "webhook_id": "uuid"
}
```

### 9.3 Signature Verification

```
X-OTOYALI-Signature: sha256=abc123...
X-OTOYALI-Timestamp: 1719669600

# Verify: HMAC-SHA256(timestamp + "." + body, webhook_secret)
```

---

## 10. Realtime API

Supabase Realtime WebSocket subscriptions.

### 10.1 Subscribe to Messages

```javascript
const channel = supabase
  .channel('conversation:uuid')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'messaging',
    table: 'messages',
    filter: 'conversation_id=eq.uuid'
  }, (payload) => {
    console.log('New message:', payload.new);
  })
  .subscribe();
```

### 10.2 Subscribe to Notifications

```javascript
const channel = supabase
  .channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'messaging',
    table: 'notifications',
    filter: 'user_id=eq.uuid'
  }, (payload) => {
    console.log('New notification:', payload.new);
  })
  .subscribe();
```

### 10.3 Subscribe to Listing Updates

```javascript
const channel = supabase
  .channel('listing:uuid')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'marketplace',
    table: 'listings',
    filter: 'id=eq.uuid'
  }, (payload) => {
    console.log('Listing updated:', payload.new);
  })
  .subscribe();
```

---

## 11. Storage API

### 11.1 Upload Flow

```
Step 1: Get upload URL
POST /functions/v1/media-upload-url
{
  "bucket": "listing-images",
  "file_name": "photo1.jpg",
  "content_type": "image/jpeg"
}

Response:
{
  "upload_url": "https://storage.../signed-url",
  "storage_path": "temp/{user_id}/{uuid}/photo1.jpg",
  "expires_at": "2026-06-29T12:05:00Z"
}

Step 2: Upload directly to signed URL
PUT {upload_url}
Content-Type: image/jpeg
Body: [binary image data]

Step 3: Reference storage_path in listing-create
```

### 11.2 Image URLs

```
Public:  https://cdn.otoyali.com/listing-images/{path}
Thumb:   https://cdn.otoyali.com/listing-images-processed/{path}_400.webp
Small:   https://cdn.otoyali.com/listing-images-processed/{path}_150.webp
```

---

## 12. OpenAPI Specification

Full OpenAPI 3.1 spec maintained at:

```
/docs/api/openapi.yaml
```

Generated documentation deployed at:
- **Internal:** `https://internal.otoyali.com/api-docs`
- **Partner:** `https://developers.otoyali.com`

Regenerated on every Edge Function deployment via CI.

---

## 13. SDK & Client Libraries

| Platform | Package | Status |
|----------|---------|--------|
| Flutter/Dart | `otoyali_client` (generated from OpenAPI) | Phase 1 |
| JavaScript/TS | `@otoyali/api-client` | Phase 2 |
| Python | `otoyali-python` | Phase 3 (partners) |
| Supabase Flutter SDK | Direct PostgREST + Edge Functions | Phase 0 |

### Flutter Client Usage Pattern

```dart
// Supabase SDK for CRUD
final listings = await supabase
  .from('listings')
  .select('*, make:vehicle_makes(name), seller:profiles(display_name)')
  .eq('status', 'active')
  .eq('category', 'car')
  .order('created_at', ascending: false)
  .range(0, 19);

// Edge Functions for business logic
final valuation = await supabase.functions.invoke('ai-valuation', body: {
  'make_id': makeId,
  'model_id': modelId,
  'year': 2020,
  'mileage_km': 50000,
  'city': 'Istanbul',
});
```

---

## 14. Versioning Strategy

| Surface | Strategy | Breaking Change Policy |
|---------|----------|----------------------|
| PostgREST | Schema versioning (additive only) | No column removal without deprecation |
| Edge Functions | URL path version (`/v1/`, `/v2/`) | 6-month deprecation notice |
| Partner API | URL path version | 12-month deprecation notice |
| Webhooks | Event schema versioning | Additive fields only |

### Deprecation Headers

```
Deprecation: true
Sunset: Sat, 29 Dec 2026 00:00:00 GMT
Link: </functions/v2/listing-search>; rel="successor-version"
```

---

## Document References

| Document | Purpose |
|----------|---------|
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Data model behind PostgREST |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | Architecture context |
| [SECURITY.md](./SECURITY.md) | Auth & authorization details |
| [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) | Backend configuration |

---

*All API changes require OpenAPI spec update and PR review. Breaking changes require ADR (Architecture Decision Record).*
