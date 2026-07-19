# OTOYALI — Database Schema

**Version:** 1.0.0  
**Classification:** Internal — Engineering  
**Last Updated:** 2026-07-19
**Owner:** Data Architecture Team  
**Database:** PostgreSQL 15+ (Supabase)

---

## Table of Contents

1. [Schema Overview](#1-schema-overview)
2. [Conventions](#2-conventions)
3. [Extensions](#3-extensions)
4. [Schema: auth (Supabase Managed)](#4-schema-auth-supabase-managed)
5. [Schema: public — Core Identity](#5-schema-public--core-identity)
6. [Schema: marketplace — Listings & Search](#6-schema-marketplace--listings--search)
7. [Schema: commerce — Payments & Subscriptions](#7-schema-commerce--payments--subscriptions)
8. [Schema: messaging — Conversations](#8-schema-messaging--conversations)
9. [Schema: content — News & CMS](#9-schema-content--news--cms)
10. [Schema: financial — Financing & Insurance](#10-schema-financial--financing--insurance)
11. [Schema: ai — ML & Embeddings](#11-schema-ai--ml--embeddings)
12. [Schema: analytics — Events & Metrics](#12-schema-analytics--events--metrics)
13. [Schema: integration — External Data](#13-schema-integration--external-data)
14. [Enumerations](#14-enumerations)
15. [Indexes Strategy](#15-indexes-strategy)
16. [Row Level Security (RLS)](#16-row-level-security-rls)
17. [Partitioning Strategy](#17-partitioning-strategy)
18. [Migration Strategy](#18-migration-strategy)

---

## 1. Schema Overview

```
otoyali_db
├── auth              (Supabase managed — users, sessions)
├── public            (profiles, preferences, addresses)
├── marketplace       (listings, vehicles, parts, services, search)
├── commerce          (payments, subscriptions, paid_listings, invoices)
├── messaging         (conversations, messages, notifications)
├── content           (news, articles, guides, media)
├── financial         (financing_applications, insurance_quotes)
├── ai                (embeddings, valuations, ai_sessions, model_runs)
├── analytics         (events, aggregates — write-only from services)
└── integration       (vin_cache, tramer_cache, partner_logs)
```

**Estimated table count:** 85+ tables  
**Estimated row count at 100M users:** 5B+ rows (with partitioning)

---

## 2. Conventions

| Convention | Rule | Example |
|------------|------|---------|
| Primary keys | `UUID v7` (time-sortable) | `id UUID PRIMARY KEY DEFAULT uuid_generate_v7()` |
| Timestamps | `TIMESTAMPTZ`, always UTC | `created_at`, `updated_at`, `deleted_at` |
| Soft delete | `deleted_at TIMESTAMPTZ NULL` | Never hard delete user data |
| Audit | `created_by`, `updated_by` UUID FK | On mutable business tables |
| i18n | JSONB `translations` or separate `_i18n` tables | `{"tr": "...", "en": "..."}` |
| Money | `BIGINT` (kuruş/cents) | `price_amount BIGINT NOT NULL` |
| Currency | `CHAR(3)` ISO 4217 | `currency CHAR(3) DEFAULT 'TRY'` |
| Locale | `VARCHAR(5)` | `locale VARCHAR(5) DEFAULT 'tr-TR'` |
| Status | PostgreSQL ENUM types | `listing_status` |
| Geo | PostGIS `GEOGRAPHY(POINT, 4326)` | `location GEOGRAPHY(POINT, 4326)` |
| Full-text | Generated `tsvector` columns | `search_vector TSVECTOR GENERATED ALWAYS AS ...` |
| Naming | snake_case, plural tables | `marketplace.listings` |
| FK naming | `{table_singular}_id` | `listing_id`, `user_id` |

---

## 3. Extensions

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";          -- fuzzy text search
CREATE EXTENSION IF NOT EXISTS "postgis";           -- geo queries
CREATE EXTENSION IF NOT EXISTS "vector";            -- pgvector embeddings
CREATE EXTENSION IF NOT EXISTS "pg_cron";           -- scheduled jobs
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- query monitoring
CREATE EXTENSION IF NOT EXISTS "btree_gist";          -- exclusion constraints
```

---

## 4. Schema: auth (Supabase Managed)

Supabase manages `auth.users`, `auth.sessions`, `auth.identities`, `auth.mfa_factors`.

**Custom auth configuration:**
- Phone provider enabled (OTP via Twilio/Netgsm)
- Email provider disabled initially (phone-first)
- JWT expiry: 3600s (1 hour)
- Refresh token rotation: enabled
- MFA: optional TOTP for dealers (Phase 2)

---

## 5. Schema: public — Core Identity

### 5.1 `public.profiles`

Extended user profile linked to `auth.users`.

```sql
CREATE TABLE public.profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone           VARCHAR(20) NOT NULL UNIQUE,
    phone_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    email           VARCHAR(255),
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    display_name    VARCHAR(100),
    avatar_url      TEXT,
    user_type       user_type NOT NULL DEFAULT 'individual',
    locale          VARCHAR(5) NOT NULL DEFAULT 'tr-TR',
    timezone        VARCHAR(50) NOT NULL DEFAULT 'Europe/Istanbul',
    city            VARCHAR(100),
    district        VARCHAR(100),
    bio             TEXT,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    verification_level verification_level NOT NULL DEFAULT 'none',
    trust_score     SMALLINT NOT NULL DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_profiles_phone ON public.profiles(phone);
CREATE INDEX idx_profiles_user_type ON public.profiles(user_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_city ON public.profiles(city) WHERE deleted_at IS NULL;
```

### 5.2 `public.dealer_profiles`

```sql
CREATE TABLE public.dealer_profiles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id         UUID NOT NULL UNIQUE REFERENCES public.profiles(id),
    business_name   VARCHAR(255) NOT NULL,
    tax_number      VARCHAR(20) NOT NULL UNIQUE,
    trade_registry  VARCHAR(50),
    license_number  VARCHAR(50),
    business_type   dealer_type NOT NULL DEFAULT 'independent',
    address         TEXT NOT NULL,
    city            VARCHAR(100) NOT NULL,
    district        VARCHAR(100),
    location        GEOGRAPHY(POINT, 4326),
    phone_business  VARCHAR(20),
    website         VARCHAR(255),
    logo_url        TEXT,
    description     TEXT,
    subscription_tier subscription_tier NOT NULL DEFAULT 'free',
    subscription_expires_at TIMESTAMPTZ,
    listing_quota   INTEGER NOT NULL DEFAULT 10,
    active_listings INTEGER NOT NULL DEFAULT 0,
    rating_avg      DECIMAL(3,2) DEFAULT 0,
    rating_count    INTEGER NOT NULL DEFAULT 0,
    is_approved     BOOLEAN NOT NULL DEFAULT FALSE,
    approved_at     TIMESTAMPTZ,
    approved_by     UUID REFERENCES public.profiles(id),
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
```

### 5.3 `public.user_preferences`

```sql
CREATE TABLE public.user_preferences (
    user_id         UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    notification_push   BOOLEAN NOT NULL DEFAULT TRUE,
    notification_sms    BOOLEAN NOT NULL DEFAULT TRUE,
    notification_email  BOOLEAN NOT NULL DEFAULT FALSE,
    notification_price_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    notification_new_matches  BOOLEAN NOT NULL DEFAULT TRUE,
    search_defaults   JSONB NOT NULL DEFAULT '{}',
    privacy_show_phone BOOLEAN NOT NULL DEFAULT FALSE,
    privacy_show_location BOOLEAN NOT NULL DEFAULT TRUE,
    ai_assistant_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5.4 `public.saved_searches`

```sql
CREATE TABLE public.saved_searches (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id),
    name            VARCHAR(100) NOT NULL,
    vehicle_category vehicle_category NOT NULL,
    filters         JSONB NOT NULL,
    alert_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
    last_matched_at TIMESTAMPTZ,
    match_count     INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 5.5 `public.user_addresses`

```sql
CREATE TABLE public.user_addresses (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id),
    label           VARCHAR(50),
    address_line    TEXT NOT NULL,
    city            VARCHAR(100) NOT NULL,
    district        VARCHAR(100),
    postal_code     VARCHAR(10),
    location        GEOGRAPHY(POINT, 4326),
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 6. Schema: marketplace — Listings & Search

### 6.1 `marketplace.vehicle_makes`

```sql
CREATE TABLE marketplace.vehicle_makes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    logo_url        TEXT,
    country         CHAR(2),
    category        vehicle_category NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    translations    JSONB NOT NULL DEFAULT '{}'
);
```

### 6.2 `marketplace.vehicle_models`

```sql
CREATE TABLE marketplace.vehicle_models (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    make_id         UUID NOT NULL REFERENCES marketplace.vehicle_makes(id),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    generation      VARCHAR(50),
    body_type       body_type,
    year_start      SMALLINT,
    year_end        SMALLINT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    translations    JSONB NOT NULL DEFAULT '{}',
    UNIQUE(make_id, slug)
);
```

### 6.3 `marketplace.vehicle_variants`

```sql
CREATE TABLE marketplace.vehicle_variants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    model_id        UUID NOT NULL REFERENCES marketplace.vehicle_models(id),
    name            VARCHAR(150) NOT NULL,
    engine_type     engine_type,
    fuel_type       fuel_type,
    transmission    transmission_type,
    horsepower      SMALLINT,
    displacement_cc INTEGER,
    drivetrain      drivetrain_type,
    year            SMALLINT,
    specifications  JSONB NOT NULL DEFAULT '{}'
);
```

### 6.4 `marketplace.listings` (Partitioned)

Core listing table — partitioned by `created_at` (monthly).

```sql
CREATE TABLE marketplace.listings (
    id              UUID NOT NULL DEFAULT uuid_generate_v7(),
    seller_id       UUID NOT NULL REFERENCES public.profiles(id),
    dealer_id       UUID REFERENCES public.dealer_profiles(id),
    category        vehicle_category NOT NULL,
    listing_type    listing_type NOT NULL DEFAULT 'sale',
    status          listing_status NOT NULL DEFAULT 'draft',
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    price_amount    BIGINT NOT NULL,
    currency        CHAR(3) NOT NULL DEFAULT 'TRY',
    price_negotiable BOOLEAN NOT NULL DEFAULT TRUE,
    ai_valuation_amount BIGINT,
    ai_valuation_confidence DECIMAL(3,2),
    ai_valuation_at TIMESTAMPTZ,
    -- Vehicle specifics
    make_id         UUID REFERENCES marketplace.vehicle_makes(id),
    model_id        UUID REFERENCES marketplace.vehicle_models(id),
    variant_id      UUID REFERENCES marketplace.vehicle_variants(id),
    year            SMALLINT,
    mileage_km      INTEGER,
    color_exterior  VARCHAR(50),
    color_interior  VARCHAR(50),
    fuel_type       fuel_type,
    transmission    transmission_type,
    engine_type     engine_type,
    body_type       body_type,
    drivetrain      drivetrain_type,
    doors           SMALLINT,
    seats           SMALLINT,
    vin             VARCHAR(17),
    plate_number    VARCHAR(20),
    -- Condition
    condition       vehicle_condition NOT NULL DEFAULT 'used',
    damage_report   JSONB,
    has_warranty    BOOLEAN DEFAULT FALSE,
    warranty_months SMALLINT,
    -- Location
    city            VARCHAR(100) NOT NULL,
    district        VARCHAR(100),
    location        GEOGRAPHY(POINT, 4326),
    -- Media
    cover_image_url TEXT,
    image_count     SMALLINT NOT NULL DEFAULT 0,
    video_url       TEXT,
    -- Engagement
    view_count      INTEGER NOT NULL DEFAULT 0,
    favorite_count  INTEGER NOT NULL DEFAULT 0,
    inquiry_count   INTEGER NOT NULL DEFAULT 0,
    -- Promotion
    promotion_tier  promotion_tier NOT NULL DEFAULT 'free',
    promotion_expires_at TIMESTAMPTZ,
    is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
    featured_until  TIMESTAMPTZ,
    -- Search
    search_vector   TSVECTOR,
    attributes      JSONB NOT NULL DEFAULT '{}',
    -- Metadata
    source          listing_source NOT NULL DEFAULT 'manual',
    external_id     VARCHAR(100),
    locale          VARCHAR(5) NOT NULL DEFAULT 'tr-TR',
    published_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    sold_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Monthly partitions created via pg_cron
-- marketplace.listings_2026_06, listings_2026_07, etc.
```

### 6.5 `marketplace.listing_images`

```sql
CREATE TABLE marketplace.listing_images (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    listing_id      UUID NOT NULL,
    listing_created_at TIMESTAMPTZ NOT NULL,
    storage_path    TEXT NOT NULL,
    url             TEXT NOT NULL,
    thumbnail_url   TEXT,
    sort_order      SMALLINT NOT NULL DEFAULT 0,
    is_cover        BOOLEAN NOT NULL DEFAULT FALSE,
    width           INTEGER,
    height          INTEGER,
    file_size_bytes INTEGER,
    ai_tags         JSONB,
    ai_damage_detected BOOLEAN DEFAULT FALSE,
    ai_quality_score DECIMAL(3,2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (listing_id, listing_created_at)
        REFERENCES marketplace.listings(id, created_at)
);
```

### 6.6 `marketplace.listing_favorites`

```sql
CREATE TABLE marketplace.listing_favorites (
    user_id         UUID NOT NULL REFERENCES public.profiles(id),
    listing_id      UUID NOT NULL,
    listing_created_at TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, listing_id)
);
```

### 6.7 `marketplace.motorcycle_listings` (Extension attributes)

```sql
CREATE TABLE marketplace.motorcycle_attributes (
    listing_id      UUID PRIMARY KEY,
    listing_created_at TIMESTAMPTZ NOT NULL,
    motorcycle_type motorcycle_type,
    engine_cc       INTEGER,
    abs             BOOLEAN,
    traction_control BOOLEAN,
    quick_shifter   BOOLEAN,
    FOREIGN KEY (listing_id, listing_created_at)
        REFERENCES marketplace.listings(id, created_at)
);
```

### 6.8 `marketplace.commercial_vehicle_attributes`

```sql
CREATE TABLE marketplace.commercial_vehicle_attributes (
    listing_id      UUID PRIMARY KEY,
    listing_created_at TIMESTAMPTZ NOT NULL,
    commercial_type commercial_vehicle_type NOT NULL,
    gvw_kg          INTEGER,
    payload_kg      INTEGER,
    axles           SMALLINT,
    cabin_type      VARCHAR(50),
    euro_class      VARCHAR(10),
    operating_hours INTEGER,
    FOREIGN KEY (listing_id, listing_created_at)
        REFERENCES marketplace.listings(id, created_at)
);
```

### 6.9 `marketplace.spare_parts`

```sql
CREATE TABLE marketplace.spare_parts (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    seller_id       UUID NOT NULL REFERENCES public.profiles(id),
    dealer_id       UUID REFERENCES public.dealer_profiles(id),
    status          listing_status NOT NULL DEFAULT 'draft',
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    price_amount    BIGINT NOT NULL,
    currency        CHAR(3) NOT NULL DEFAULT 'TRY',
    condition       part_condition NOT NULL DEFAULT 'new',
    part_category   part_category NOT NULL,
    oem_number      VARCHAR(50),
    aftermarket_number VARCHAR(50),
    brand           VARCHAR(100),
    -- Fitment
    compatible_makes JSONB NOT NULL DEFAULT '[]',
    compatible_models JSONB NOT NULL DEFAULT '[]',
    compatible_years JSONB,
    vin_required    BOOLEAN NOT NULL DEFAULT FALSE,
    -- Inventory
    quantity        INTEGER NOT NULL DEFAULT 1,
    sku             VARCHAR(50),
    -- Location
    city            VARCHAR(100) NOT NULL,
    location        GEOGRAPHY(POINT, 4326),
    -- Media
    cover_image_url TEXT,
    -- Search
    search_vector   TSVECTOR,
    attributes      JSONB NOT NULL DEFAULT '{}',
    view_count      INTEGER NOT NULL DEFAULT 0,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
```

### 6.10 `marketplace.services`

```sql
CREATE TABLE marketplace.services (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    provider_id     UUID NOT NULL REFERENCES public.profiles(id),
    dealer_id       UUID REFERENCES public.dealer_profiles(id),
    status          listing_status NOT NULL DEFAULT 'draft',
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    service_category service_category NOT NULL,
    price_type      price_type NOT NULL DEFAULT 'fixed',
    price_amount    BIGINT,
    price_min       BIGINT,
    price_max       BIGINT,
    currency        CHAR(3) NOT NULL DEFAULT 'TRY',
    duration_minutes INTEGER,
    city            VARCHAR(100) NOT NULL,
    district        VARCHAR(100),
    location        GEOGRAPHY(POINT, 4326),
    service_radius_km INTEGER,
    cover_image_url TEXT,
    rating_avg      DECIMAL(3,2) DEFAULT 0,
    rating_count    INTEGER NOT NULL DEFAULT 0,
    booking_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    attributes      JSONB NOT NULL DEFAULT '{}',
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
```

### 6.11 `marketplace.service_bookings`

Status note: this early conceptual table is superseded in the codebase by the
additive BOOKING-01A `booking` schema, which reuses SERVICE-01
`service_marketplace.providers`, `service_marketplace.branches`, and
`service_marketplace.offerings`. The active foundation is documented in
`apps/web/docs/BOOKING_ARCHITECTURE.md`; future booking UI belongs to
BOOKING-01B.

```sql
CREATE TABLE marketplace.service_bookings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    service_id      UUID NOT NULL REFERENCES marketplace.services(id),
    customer_id     UUID NOT NULL REFERENCES public.profiles(id),
    status          booking_status NOT NULL DEFAULT 'pending',
    scheduled_at    TIMESTAMPTZ NOT NULL,
    vehicle_info    JSONB,
    notes           TEXT,
    price_amount    BIGINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 6.12 `marketplace.reviews`

```sql
CREATE TABLE marketplace.reviews (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    reviewer_id     UUID NOT NULL REFERENCES public.profiles(id),
    reviewee_id     UUID NOT NULL REFERENCES public.profiles(id),
    listing_id      UUID,
    service_id      UUID REFERENCES marketplace.services(id),
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title           VARCHAR(200),
    body            TEXT,
    response        TEXT,
    response_at     TIMESTAMPTZ,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    sentiment_score DECIMAL(3,2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
```

### 6.13 `marketplace.vin_records`

```sql
CREATE TABLE marketplace.vin_records (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    vin             VARCHAR(17) NOT NULL UNIQUE,
    decoded_data    JSONB NOT NULL,
    make            VARCHAR(100),
    model           VARCHAR(100),
    year            SMALLINT,
    engine          VARCHAR(100),
    fuel_type       fuel_type,
    body_type       body_type,
    country_of_origin CHAR(2),
    decoded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decode_source   VARCHAR(50) NOT NULL DEFAULT 'nhtsa'
);
```

### 6.14 `marketplace.vin_history_reports`

```sql
CREATE TABLE marketplace.vin_history_reports (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    vin             VARCHAR(17) NOT NULL,
    requested_by    UUID NOT NULL REFERENCES public.profiles(id),
    listing_id      UUID,
    report_type     vin_report_type NOT NULL DEFAULT 'basic',
    status          report_status NOT NULL DEFAULT 'pending',
    -- Tramer data
    accident_count  SMALLINT,
    ownership_count SMALLINT,
    has_lien        BOOLEAN,
    has_flood_damage BOOLEAN,
    mileage_records JSONB,
    accident_details JSONB,
    ownership_history JSONB,
    raw_response    JSONB,
    -- Payment
    payment_id      UUID,
    price_paid      BIGINT,
    -- Cache
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_vin_history_vin ON marketplace.vin_history_reports(vin);
CREATE INDEX idx_vin_history_user ON marketplace.vin_history_reports(requested_by);
```

---

## 7. Schema: commerce — Payments & Subscriptions

### 7.1 `commerce.payment_methods`

```sql
CREATE TABLE commerce.payment_methods (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id),
    provider        payment_provider NOT NULL DEFAULT 'iyzico',
    provider_token  VARCHAR(255) NOT NULL,
    card_last_four  CHAR(4),
    card_brand      VARCHAR(20),
    card_exp_month  SMALLINT,
    card_exp_year   SMALLINT,
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
```

### 7.2 `commerce.payments`

```sql
CREATE TABLE commerce.payments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id),
    amount          BIGINT NOT NULL,
    currency        CHAR(3) NOT NULL DEFAULT 'TRY',
    status          payment_status NOT NULL DEFAULT 'pending',
    provider        payment_provider NOT NULL,
    provider_payment_id VARCHAR(255),
    provider_response JSONB,
    payment_type    payment_type NOT NULL,
    reference_type  VARCHAR(50),
    reference_id    UUID,
    idempotency_key VARCHAR(255) UNIQUE,
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);
```

### 7.3 `commerce.paid_listing_packages`

```sql
CREATE TABLE commerce.paid_listing_packages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(50) NOT NULL UNIQUE,
    tier            promotion_tier NOT NULL,
    duration_days   INTEGER NOT NULL,
    price_amount    BIGINT NOT NULL,
    currency        CHAR(3) NOT NULL DEFAULT 'TRY',
    features        JSONB NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    translations    JSONB NOT NULL DEFAULT '{}',
    sort_order      INTEGER NOT NULL DEFAULT 0
);
```

### 7.4 `commerce.listing_promotions`

```sql
CREATE TABLE commerce.listing_promotions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    listing_id      UUID NOT NULL,
    user_id         UUID NOT NULL REFERENCES public.profiles(id),
    package_id      UUID NOT NULL REFERENCES commerce.paid_listing_packages(id),
    payment_id      UUID REFERENCES commerce.payments(id),
    tier            promotion_tier NOT NULL,
    starts_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    impressions     INTEGER NOT NULL DEFAULT 0,
    clicks          INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7.5 `commerce.subscriptions`

```sql
CREATE TABLE commerce.subscriptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id),
    dealer_id       UUID REFERENCES public.dealer_profiles(id),
    plan_id         UUID NOT NULL REFERENCES commerce.subscription_plans(id),
    status          subscription_status NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end   TIMESTAMPTZ NOT NULL,
    cancel_at       TIMESTAMPTZ,
    cancelled_at    TIMESTAMPTZ,
    provider_subscription_id VARCHAR(255),
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 7.6 `commerce.subscription_plans`

```sql
CREATE TABLE commerce.subscription_plans (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(50) NOT NULL UNIQUE,
    tier            subscription_tier NOT NULL,
    price_amount    BIGINT NOT NULL,
    currency        CHAR(3) NOT NULL DEFAULT 'TRY',
    billing_interval billing_interval NOT NULL DEFAULT 'monthly',
    listing_quota   INTEGER NOT NULL,
    features        JSONB NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    translations    JSONB NOT NULL DEFAULT '{}'
);
```

### 7.7 `commerce.invoices`

```sql
CREATE TABLE commerce.invoices (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id),
    payment_id      UUID REFERENCES commerce.payments(id),
    invoice_number  VARCHAR(50) NOT NULL UNIQUE,
    amount          BIGINT NOT NULL,
    tax_amount      BIGINT NOT NULL DEFAULT 0,
    currency        CHAR(3) NOT NULL DEFAULT 'TRY',
    status          invoice_status NOT NULL DEFAULT 'draft',
    billing_details JSONB NOT NULL,
    pdf_url         TEXT,
    issued_at       TIMESTAMPTZ,
    due_at          TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 8. Schema: messaging — Conversations

### 8.1 `messaging.conversations`

```sql
CREATE TABLE messaging.conversations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    listing_id      UUID,
    listing_created_at TIMESTAMPTZ,
    part_id         UUID REFERENCES marketplace.spare_parts(id),
    service_id      UUID REFERENCES marketplace.services(id),
    subject         VARCHAR(255),
    status          conversation_status NOT NULL DEFAULT 'active',
    last_message_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 8.2 `messaging.conversation_participants`

```sql
CREATE TABLE messaging.conversation_participants (
    conversation_id UUID NOT NULL REFERENCES messaging.conversations(id),
    user_id         UUID NOT NULL REFERENCES public.profiles(id),
    role            participant_role NOT NULL DEFAULT 'buyer',
    last_read_at    TIMESTAMPTZ,
    is_muted        BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at         TIMESTAMPTZ,
    PRIMARY KEY (conversation_id, user_id)
);
```

### 8.3 `messaging.messages` (Partitioned by conversation_id hash)

```sql
CREATE TABLE messaging.messages (
    id              UUID NOT NULL DEFAULT uuid_generate_v7(),
    conversation_id UUID NOT NULL,
    sender_id       UUID NOT NULL REFERENCES public.profiles(id),
    message_type    message_type NOT NULL DEFAULT 'text',
    content         TEXT,
    attachments     JSONB,
    metadata        JSONB NOT NULL DEFAULT '{}',
    is_system       BOOLEAN NOT NULL DEFAULT FALSE,
    read_by         UUID[],
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ,
    PRIMARY KEY (id, conversation_id)
) PARTITION BY HASH (conversation_id);
-- 16 partitions: messages_p0 .. messages_p15
```

### 8.4 `messaging.notifications`

```sql
CREATE TABLE messaging.notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id),
    type            notification_type NOT NULL,
    title           VARCHAR(255) NOT NULL,
    body            TEXT NOT NULL,
    data            JSONB NOT NULL DEFAULT '{}',
    channel         notification_channel NOT NULL,
    status          notification_status NOT NULL DEFAULT 'pending',
    read_at         TIMESTAMPTZ,
    sent_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_unread
    ON messaging.notifications(user_id, created_at DESC)
    WHERE read_at IS NULL;
```

---

## 9. Schema: content — News & CMS

### 9.1 `content.categories`

```sql
CREATE TABLE content.categories (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    parent_id       UUID REFERENCES content.categories(id),
    sort_order      INTEGER NOT NULL DEFAULT 0,
    translations    JSONB NOT NULL DEFAULT '{}'
);
```

### 9.2 `content.articles`

```sql
CREATE TABLE content.articles (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    author_id       UUID REFERENCES public.profiles(id),
    category_id     UUID REFERENCES content.categories(id),
    status          article_status NOT NULL DEFAULT 'draft',
    title           VARCHAR(500) NOT NULL,
    slug            VARCHAR(500) NOT NULL UNIQUE,
    excerpt         TEXT,
    body            TEXT NOT NULL,
    cover_image_url TEXT,
    locale          VARCHAR(5) NOT NULL DEFAULT 'tr-TR',
    tags            TEXT[],
    seo_title       VARCHAR(255),
    seo_description VARCHAR(500),
    search_vector   TSVECTOR,
    view_count      INTEGER NOT NULL DEFAULT 0,
    is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
```

### 9.3 `content.article_translations`

```sql
CREATE TABLE content.article_translations (
    article_id      UUID NOT NULL REFERENCES content.articles(id),
    locale          VARCHAR(5) NOT NULL,
    title           VARCHAR(500) NOT NULL,
    excerpt         TEXT,
    body            TEXT NOT NULL,
    seo_title       VARCHAR(255),
    seo_description VARCHAR(500),
    translated_by   translation_source NOT NULL DEFAULT 'human',
    PRIMARY KEY (article_id, locale)
);
```

---

## 10. Schema: financial — Financing & Insurance

### 10.1 `financial.financing_partners`

```sql
CREATE TABLE financial.financing_partners (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(50) NOT NULL UNIQUE,
    logo_url        TEXT,
    partner_type    financial_partner_type NOT NULL,
    api_config      JSONB NOT NULL,
    min_loan_amount BIGINT NOT NULL,
    max_loan_amount BIGINT NOT NULL,
    min_term_months SMALLINT NOT NULL,
    max_term_months SMALLINT NOT NULL,
    base_interest_rate DECIMAL(5,2),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order      INTEGER NOT NULL DEFAULT 0
);
```

### 10.2 `financial.financing_applications`

```sql
CREATE TABLE financial.financing_applications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id),
    listing_id      UUID,
    partner_id      UUID NOT NULL REFERENCES financial.financing_partners(id),
    status          application_status NOT NULL DEFAULT 'draft',
    loan_amount     BIGINT NOT NULL,
    down_payment    BIGINT,
    term_months     SMALLINT NOT NULL,
    interest_rate   DECIMAL(5,2),
    monthly_payment BIGINT,
    applicant_data  JSONB NOT NULL,
    partner_reference VARCHAR(255),
    partner_response JSONB,
    decision        application_decision,
    decision_at     TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 10.3 `financial.insurance_partners`

```sql
CREATE TABLE financial.insurance_partners (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(50) NOT NULL UNIQUE,
    logo_url        TEXT,
    insurance_types insurance_type[] NOT NULL,
    api_config      JSONB NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);
```

### 10.4 `financial.insurance_quotes`

```sql
CREATE TABLE financial.insurance_quotes (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id         UUID NOT NULL REFERENCES public.profiles(id),
    listing_id      UUID,
    partner_id      UUID NOT NULL REFERENCES financial.insurance_partners(id),
    insurance_type  insurance_type NOT NULL,
    status          quote_status NOT NULL DEFAULT 'pending',
    vehicle_data    JSONB NOT NULL,
    coverage_details JSONB,
    premium_amount  BIGINT,
    premium_monthly BIGINT,
    deductible      BIGINT,
    partner_quote_id VARCHAR(255),
    partner_response JSONB,
    valid_until     TIMESTAMPTZ,
    bound_at        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 11. Schema: ai — ML & Embeddings

### 11.1 `ai.listing_embeddings`

```sql
CREATE TABLE ai.listing_embeddings (
    listing_id      UUID PRIMARY KEY,
    embedding       VECTOR(3072) NOT NULL,
    model_version   VARCHAR(50) NOT NULL,
    source_text     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listing_embeddings_hnsw
    ON ai.listing_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);
```

### 11.2 `ai.valuation_models`

```sql
CREATE TABLE ai.valuation_models (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    version         VARCHAR(50) NOT NULL UNIQUE,
    category        vehicle_category NOT NULL,
    model_path      TEXT NOT NULL,
    metrics         JSONB NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    trained_at      TIMESTAMPTZ NOT NULL,
    deployed_at     TIMESTAMPTZ
);
```

### 11.3 `ai.valuation_results`

```sql
CREATE TABLE ai.valuation_results (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    listing_id      UUID,
    user_id         UUID REFERENCES public.profiles(id),
    model_version   VARCHAR(50) NOT NULL,
    input_data      JSONB NOT NULL,
    predicted_amount BIGINT NOT NULL,
    confidence      DECIMAL(3,2) NOT NULL,
    price_range_min BIGINT,
    price_range_max BIGINT,
    comparables     JSONB,
    market_trend    JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 11.4 `ai.assistant_sessions`

```sql
CREATE TABLE ai.assistant_sessions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    user_id         UUID REFERENCES public.profiles(id),
    session_token   VARCHAR(100) NOT NULL UNIQUE,
    locale          VARCHAR(5) NOT NULL DEFAULT 'tr-TR',
    context         JSONB NOT NULL DEFAULT '{}',
    message_count   INTEGER NOT NULL DEFAULT 0,
    total_tokens    INTEGER NOT NULL DEFAULT 0,
    last_active_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL
);
```

### 11.5 `ai.assistant_messages`

```sql
CREATE TABLE ai.assistant_messages (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    session_id      UUID NOT NULL REFERENCES ai.assistant_sessions(id),
    role            message_role NOT NULL,
    content         TEXT NOT NULL,
    tool_calls      JSONB,
    tool_results    JSONB,
    tokens_used     INTEGER,
    model           VARCHAR(50),
    latency_ms      INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 11.6 `ai.fraud_scores`

```sql
CREATE TABLE ai.fraud_scores (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    entity_type     VARCHAR(50) NOT NULL,
    entity_id       UUID NOT NULL,
    score           DECIMAL(5,4) NOT NULL,
    signals         JSONB NOT NULL,
    model_version   VARCHAR(50) NOT NULL,
    action_taken    fraud_action,
    reviewed_by     UUID REFERENCES public.profiles(id),
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 12. Schema: analytics — Events & Metrics

### 12.1 `analytics.events` (Partitioned daily)

```sql
CREATE TABLE analytics.events (
    id              UUID NOT NULL DEFAULT uuid_generate_v7(),
    event_name      VARCHAR(100) NOT NULL,
    user_id         UUID,
    session_id      VARCHAR(100),
    properties      JSONB NOT NULL DEFAULT '{}',
    device_type     VARCHAR(20),
    platform        VARCHAR(20),
    app_version     VARCHAR(20),
    locale          VARCHAR(5),
    ip_hash         VARCHAR(64),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
```

### 12.2 `analytics.daily_metrics`

```sql
CREATE TABLE analytics.daily_metrics (
    date            DATE NOT NULL,
    metric_name     VARCHAR(100) NOT NULL,
    dimensions      JSONB NOT NULL DEFAULT '{}',
    value           BIGINT NOT NULL,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (date, metric_name, dimensions)
);
```

---

## 13. Schema: integration — External Data

### 13.1 `integration.api_call_logs`

```sql
CREATE TABLE integration.api_call_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    provider        VARCHAR(50) NOT NULL,
    endpoint        VARCHAR(255) NOT NULL,
    method          VARCHAR(10) NOT NULL,
    request_hash    VARCHAR(64),
    status_code     SMALLINT,
    latency_ms      INTEGER,
    error_message   TEXT,
    user_id         UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);
```

### 13.2 `integration.webhook_events`

```sql
CREATE TABLE integration.webhook_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    source          VARCHAR(50) NOT NULL,
    event_type      VARCHAR(100) NOT NULL,
    payload         JSONB NOT NULL,
    status          webhook_status NOT NULL DEFAULT 'received',
    processed_at    TIMESTAMPTZ,
    error_message   TEXT,
    retry_count     SMALLINT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 14. Enumerations

```sql
-- User & Identity
CREATE TYPE user_type AS ENUM ('individual', 'dealer', 'fleet', 'admin');
CREATE TYPE verification_level AS ENUM ('none', 'phone', 'email', 'identity', 'business');
CREATE TYPE dealer_type AS ENUM ('independent', 'franchise', 'fleet', 'auction');

-- Marketplace
CREATE TYPE vehicle_category AS ENUM ('car', 'motorcycle', 'commercial', 'part', 'service');
CREATE TYPE listing_type AS ENUM ('sale', 'rent', 'lease', 'auction');
CREATE TYPE listing_status AS ENUM ('draft', 'pending_review', 'active', 'paused', 'sold', 'expired', 'rejected', 'removed');
CREATE TYPE listing_source AS ENUM ('manual', 'dealer_sync', 'api', 'import');
CREATE TYPE vehicle_condition AS ENUM ('new', 'used', 'certified_pre_owned', 'salvage', 'for_parts');
CREATE TYPE body_type AS ENUM ('sedan', 'hatchback', 'suv', 'crossover', 'coupe', 'convertible', 'wagon', 'van', 'pickup', 'minivan', 'other');
CREATE TYPE fuel_type AS ENUM ('gasoline', 'diesel', 'lpg', 'electric', 'hybrid', 'plug_in_hybrid', 'cng', 'hydrogen');
CREATE TYPE transmission_type AS ENUM ('manual', 'automatic', 'cvt', 'dct', 'semi_automatic');
CREATE TYPE engine_type AS ENUM ('inline', 'v', 'boxer', 'rotary', 'electric_motor');
CREATE TYPE drivetrain_type AS ENUM ('fwd', 'rwd', 'awd', 'four_wd');
CREATE TYPE motorcycle_type AS ENUM ('sport', 'cruiser', 'touring', 'naked', 'scooter', 'off_road', 'adventure', 'classic', 'electric');
CREATE TYPE commercial_vehicle_type AS ENUM ('van', 'truck', 'bus', 'minibus', 'trailer', 'construction', 'agricultural', 'forklift');
CREATE TYPE part_category AS ENUM ('engine', 'transmission', 'body', 'electrical', 'suspension', 'brakes', 'interior', 'exterior', 'wheels_tires', 'accessories');
CREATE TYPE part_condition AS ENUM ('new', 'used', 'refurbished', 'oem', 'aftermarket');
CREATE TYPE service_category AS ENUM ('maintenance', 'repair', 'detailing', 'inspection', 'towing', 'customization', 'tire', 'glass', 'electrical', 'body_work');
CREATE TYPE price_type AS ENUM ('fixed', 'hourly', 'quote', 'free');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE promotion_tier AS ENUM ('free', 'standard', 'premium', 'urgent', 'spotlight');
CREATE TYPE vin_report_type AS ENUM ('basic', 'full', 'premium');
CREATE TYPE report_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'expired');

-- Commerce
CREATE TYPE payment_provider AS ENUM ('iyzico', 'stripe');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled');
CREATE TYPE payment_type AS ENUM ('listing_promotion', 'subscription', 'vin_report', 'escrow', 'other');
CREATE TYPE subscription_tier AS ENUM ('free', 'basic', 'pro', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'cancelled', 'expired', 'trialing');
CREATE TYPE billing_interval AS ENUM ('monthly', 'quarterly', 'yearly');
CREATE TYPE invoice_status AS ENUM ('draft', 'issued', 'paid', 'overdue', 'cancelled');

-- Messaging
CREATE TYPE conversation_status AS ENUM ('active', 'archived', 'blocked');
CREATE TYPE participant_role AS ENUM ('buyer', 'seller', 'dealer', 'support');
CREATE TYPE message_type AS ENUM ('text', 'image', 'offer', 'system', 'location');
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system', 'tool');
CREATE TYPE notification_type AS ENUM ('message', 'price_alert', 'listing_match', 'promotion', 'system', 'review', 'booking');
CREATE TYPE notification_channel AS ENUM ('push', 'sms', 'email', 'in_app');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'read');

-- Content
CREATE TYPE article_status AS ENUM ('draft', 'review', 'published', 'archived');
CREATE TYPE translation_source AS ENUM ('human', 'ai', 'machine');

-- Financial
CREATE TYPE financial_partner_type AS ENUM ('bank', 'nbfi', 'leasing');
CREATE TYPE insurance_type AS ENUM ('kasko', 'trafik', 'imm', 'combined');
CREATE TYPE application_status AS ENUM ('draft', 'submitted', 'processing', 'approved', 'rejected', 'expired', 'cancelled');
CREATE TYPE application_decision AS ENUM ('approved', 'rejected', 'conditional', 'pending');
CREATE TYPE quote_status AS ENUM ('pending', 'quoted', 'accepted', 'bound', 'expired', 'declined');

-- AI
CREATE TYPE fraud_action AS ENUM ('none', 'flag', 'review', 'block', 'remove');
CREATE TYPE webhook_status AS ENUM ('received', 'processing', 'processed', 'failed', 'dead_letter');
```

---

## 15. Indexes Strategy

### Critical Indexes

```sql
-- Listings: primary search patterns
CREATE INDEX idx_listings_status_category ON marketplace.listings(status, category)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_listings_seller ON marketplace.listings(seller_id)
    WHERE deleted_at IS NULL;
CREATE INDEX idx_listings_make_model ON marketplace.listings(make_id, model_id, year)
    WHERE status = 'active';
CREATE INDEX idx_listings_price ON marketplace.listings(price_amount)
    WHERE status = 'active';
CREATE INDEX idx_listings_location ON marketplace.listings USING GIST(location)
    WHERE status = 'active';
CREATE INDEX idx_listings_published ON marketplace.listings(published_at DESC)
    WHERE status = 'active';
CREATE INDEX idx_listings_featured ON marketplace.listings(is_featured, featured_until)
    WHERE is_featured = TRUE;
CREATE INDEX idx_listings_search ON marketplace.listings USING GIN(search_vector);
CREATE INDEX idx_listings_vin ON marketplace.listings(vin) WHERE vin IS NOT NULL;

-- Parts
CREATE INDEX idx_parts_category ON marketplace.spare_parts(part_category, status);
CREATE INDEX idx_parts_oem ON marketplace.spare_parts(oem_number);
CREATE INDEX idx_parts_search ON marketplace.spare_parts USING GIN(search_vector);

-- Messages
CREATE INDEX idx_messages_conversation ON messaging.messages(conversation_id, created_at DESC);

-- Analytics (BRIN for time-series)
CREATE INDEX idx_events_created ON analytics.events USING BRIN(created_at);
```

---

## 16. Row Level Security (RLS)

All user-facing tables MUST have RLS enabled. Example policies:

```sql
-- Profiles: users read own, public read basic info
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY profiles_select_own ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY profiles_select_public ON public.profiles
    FOR SELECT USING (
        deleted_at IS NULL
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY profiles_update_own ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Listings: public read active, owner CRUD
ALTER TABLE marketplace.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY listings_select_active ON marketplace.listings
    FOR SELECT USING (
        status = 'active' AND deleted_at IS NULL
        OR seller_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.dealer_profiles d
            WHERE d.id = dealer_id AND d.user_id = auth.uid()
        )
    );

CREATE POLICY listings_insert_own ON marketplace.listings
    FOR INSERT WITH CHECK (seller_id = auth.uid());

CREATE POLICY listings_update_own ON marketplace.listings
    FOR UPDATE USING (
        seller_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.dealer_profiles d
            WHERE d.id = dealer_id AND d.user_id = auth.uid()
        )
    );

-- Messages: participants only
CREATE POLICY messages_select_participant ON messaging.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM messaging.conversation_participants cp
            WHERE cp.conversation_id = messages.conversation_id
            AND cp.user_id = auth.uid()
            AND cp.left_at IS NULL
        )
    );
```

See [SECURITY.md](./SECURITY.md) for complete RLS policy catalog.

---

## 17. Partitioning Strategy

| Table | Strategy | Partition Key | Retention |
|-------|----------|---------------|-----------|
| `marketplace.listings` | RANGE monthly | `created_at` | Indefinite (archive cold) |
| `messaging.messages` | HASH 16 buckets | `conversation_id` | Indefinite |
| `analytics.events` | RANGE daily | `created_at` | 90 days PG, forever ClickHouse |
| `integration.api_call_logs` | RANGE weekly | `created_at` | 30 days |
| `ai.assistant_messages` | RANGE monthly | `created_at` | 1 year |

**Automated partition management via pg_cron:**

```sql
SELECT cron.schedule('create-listing-partitions', '0 0 1 * *',
    $$SELECT marketplace.create_monthly_partition('listings', CURRENT_DATE + INTERVAL '1 month')$$
);
```

---

## 18. Migration Strategy

### Rules

1. All migrations in `supabase/migrations/` with timestamp prefix
2. Migrations are **forward-only** — no down migrations in production
3. Destructive changes require multi-phase migration (add → migrate → remove)
4. RLS policies deployed in same migration as table creation
5. Seed data in separate `supabase/seed.sql` (dev/staging only)
6. Schema changes require PR review from 2 engineers

### Migration Naming

```
YYYYMMDDHHMMSS_description.sql
20260629120000_create_marketplace_schema.sql
20260629120001_create_listings_table.sql
20260629120002_create_listings_rls_policies.sql
```

---

## Document References

| Document | Purpose |
|----------|---------|
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | Architecture overview |
| [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) | Setup instructions |
| [SECURITY.md](./SECURITY.md) | RLS & security policies |
| [API_DESIGN.md](./API_DESIGN.md) | API exposure of tables |

---

*This schema supports 100M+ users with partitioning, indexing, and RLS. All monetary values stored as BIGINT in kuruş (1/100 TRY).*
