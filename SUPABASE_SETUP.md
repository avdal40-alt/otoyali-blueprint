# OTOYALI — Supabase Setup Guide

**Version:** 1.0.0  
**Classification:** Internal — Engineering  
**Last Updated:** 2026-06-29  
**Owner:** Platform Engineering Team

---

## Table of Contents

1. [Overview](#1-overview)
2. [Project Provisioning](#2-project-provisioning)
3. [Environment Configuration](#3-environment-configuration)
4. [Database Setup](#4-database-setup)
5. [Authentication Configuration](#5-authentication-configuration)
6. [Storage Configuration](#6-storage-configuration)
7. [Edge Functions Setup](#7-edge-functions-setup)
8. [Realtime Configuration](#8-realtime-configuration)
9. [Row Level Security Setup](#9-row-level-security-setup)
10. [Extensions & PostgreSQL Configuration](#10-extensions--postgresql-configuration)
11. [Secrets Management](#11-secrets-management)
12. [Local Development Setup](#12-local-development-setup)
13. [CI/CD Integration](#13-cicd-integration)
14. [Monitoring & Maintenance](#14-monitoring--maintenance)
15. [Scaling Configuration](#15-scaling-configuration)

---

## 1. Overview

OTOYALI uses Supabase as the primary backend platform providing:

- **PostgreSQL** — Primary database with RLS
- **Auth** — Phone OTP authentication
- **Storage** — Media file management
- **Edge Functions** — Business logic (Deno/TypeScript)
- **Realtime** — Live messaging and notifications
- **PostgREST** — Auto-generated REST API

### Supabase Plan Progression

| Phase | Plan | Users | Database | Storage | Edge Functions |
|-------|------|-------|----------|---------|----------------|
| Phase 0–1 | Pro ($25/mo) | <100K | 8GB | 100GB | 500K invocations |
| Phase 2 | Pro + Compute | <3M | 50GB + replica | 500GB | 2M invocations |
| Phase 3 | Enterprise | <10M | Dedicated | 2TB | Unlimited |
| Phase 4 | Enterprise Custom | 100M+ | Multi-region | Unlimited | Unlimited |

---

## 2. Project Provisioning

### 2.1 Create Supabase Projects

Create three separate Supabase projects:

| Project | Name | Region | Purpose |
|---------|------|--------|---------|
| Development | `otoyali-dev` | eu-central-1 (Frankfurt) | Feature development |
| Staging | `otoyali-staging` | eu-central-1 (Frankfurt) | QA and pre-production |
| Production | `otoyali-prod` | eu-central-1 (Frankfurt) | Live traffic |

**Region selection rationale:** Frankfurt provides lowest latency to Turkey (~30ms Istanbul).

### 2.2 Project Settings

For each project, configure in Supabase Dashboard → Settings:

```
General:
  Project Name: otoyali-{env}
  Region: eu-central-1

Database:
  Postgres Version: 15
  Connection Pooling: Enabled (PgBouncer, Transaction mode)
  Pool Size: 15 (dev), 30 (staging), 50 (prod)

API:
  Enable Data API: Yes
  Exposed schemas: public, marketplace, commerce, messaging, content, financial
  Max rows returned: 1000
  Enable RLS: Yes (enforce on all tables)

Auth:
  Site URL: https://otoyali.com (prod) / https://staging.otoyali.com
  Redirect URLs: otoyali.com/**, otoyali.app://**, localhost:3000/**
  JWT Expiry: 3600 (1 hour)
  Enable Refresh Token Rotation: Yes
  Refresh Token Reuse Interval: 10 seconds

Storage:
  File Size Limit: 10MB (images), 50MB (documents)
  Allowed MIME types: image/jpeg, image/png, image/webp, application/pdf
```

### 2.3 Custom Domain Setup (Production)

```
Supabase Dashboard → Settings → Custom Domains

API:  api.otoyali.com → {project-ref}.supabase.co
Auth: auth.otoyali.com → {project-ref}.supabase.co (optional)

DNS Records (Cloudflare):
  CNAME api → {project-ref}.supabase.co
  CNAME auth → {project-ref}.supabase.co
```

---

## 3. Environment Configuration

### 3.1 Environment Variables

#### Supabase Dashboard → Settings → Edge Functions → Secrets

```bash
# Core
ENVIRONMENT=production                          # development | staging | production
APP_URL=https://otoyali.com
API_URL=https://api.otoyali.com

# SMS / OTP
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...
NETGSM_USERCODE=...
NETGSM_PASSWORD=...
SMS_PROVIDER=netgsm                             # netgsm for Turkey primary

# AI / LLM
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
AI_DEFAULT_MODEL=gpt-4o
AI_FALLBACK_MODEL=claude-3-5-sonnet-20241022
AI_EMBEDDING_MODEL=text-embedding-3-large

# Payments
IYZICO_API_KEY=...
IYZICO_SECRET_KEY=...
IYZICO_BASE_URL=https://api.iyzipay.com         # sandbox: sandbox-api.iyzipay.com

# VIN / Tramer
TRAMER_API_URL=...
TRAMER_API_KEY=...
NHTSA_VIN_API=https://vpic.nhtsa.dot.gov/api

# External Services
GOOGLE_MAPS_API_KEY=...
FCM_SERVER_KEY=...
RESEND_API_KEY=re_...
SENTRY_DSN=https://...

# Search
ELASTICSEARCH_URL=https://...
ELASTICSEARCH_API_KEY=...

# Cache
UPSTASH_REDIS_URL=https://...
UPSTASH_REDIS_TOKEN=...

# Monitoring
GRAFANA_API_KEY=...
POSTHOG_API_KEY=...
```

### 3.2 FlutterFlow / Client Environment

```dart
// lib/backend/supabase/supabase.dart
class SupabaseConfig {
  static const String url = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://{dev-ref}.supabase.co',
  );
  static const String anonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: '{dev-anon-key}',
  );
}
```

### 3.3 Environment Matrix

| Variable | Dev | Staging | Prod |
|----------|-----|---------|------|
| SUPABASE_URL | dev-ref.supabase.co | staging-ref.supabase.co | api.otoyali.com |
| SMS_PROVIDER | twilio (test) | netgsm | netgsm |
| IYZICO_BASE_URL | sandbox | sandbox | production |
| AI_DEFAULT_MODEL | gpt-4o-mini | gpt-4o | gpt-4o |
| SENTRY_DSN | — | staging DSN | prod DSN |
| ENVIRONMENT | development | staging | production |

---

## 4. Database Setup

### 4.1 Schema Creation Order

Execute migrations in this order:

```bash
# Migration sequence
supabase/migrations/
├── 20260629000001_enable_extensions.sql
├── 20260629000002_create_enums.sql
├── 20260629000003_create_public_schema.sql
├── 20260629000004_create_marketplace_schema.sql
├── 20260629000005_create_commerce_schema.sql
├── 20260629000006_create_messaging_schema.sql
├── 20260629000007_create_content_schema.sql
├── 20260629000008_create_financial_schema.sql
├── 20260629000009_create_ai_schema.sql
├── 20260629000010_create_analytics_schema.sql
├── 20260629000011_create_integration_schema.sql
├── 20260629000012_create_indexes.sql
├── 20260629000013_create_rls_policies.sql
├── 20260629000014_create_functions_triggers.sql
├── 20260629000015_create_partitions.sql
├── 20260629000016_create_cron_jobs.sql
└── 20260629000017_seed_reference_data.sql
```

### 4.2 Initial Migration — Extensions

```sql
-- 20260629000001_enable_extensions.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA extensions;

-- Create application schemas
CREATE SCHEMA IF NOT EXISTS marketplace;
CREATE SCHEMA IF NOT EXISTS commerce;
CREATE SCHEMA IF NOT EXISTS messaging;
CREATE SCHEMA IF NOT EXISTS content;
CREATE SCHEMA IF NOT EXISTS financial;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS analytics;
CREATE SCHEMA IF NOT EXISTS integration;

-- Grant usage to authenticated and service roles
GRANT USAGE ON SCHEMA marketplace TO authenticated, service_role;
GRANT USAGE ON SCHEMA commerce TO authenticated, service_role;
GRANT USAGE ON SCHEMA messaging TO authenticated, service_role;
GRANT USAGE ON SCHEMA content TO authenticated, service_role;
GRANT USAGE ON SCHEMA financial TO authenticated, service_role;
GRANT USAGE ON SCHEMA ai TO authenticated, service_role;
GRANT USAGE ON SCHEMA analytics TO service_role;
GRANT USAGE ON SCHEMA integration TO service_role;
```

### 4.3 UUID v7 Function

```sql
-- Time-sortable UUID v7 generation
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS UUID AS $$
DECLARE
  unix_ts_ms BIGINT;
  uuid_bytes BYTEA;
BEGIN
  unix_ts_ms = (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  uuid_bytes = SET_BYTE(
    SET_BYTE(
      SET_BYTE(
        SET_BYTE(
          SET_BYTE(
            SET_BYTE(
              gen_random_bytes(16),
              0, (unix_ts_ms >> 40)::INT
            ),
            1, (unix_ts_ms >> 32)::INT
          ),
          2, (unix_ts_ms >> 24)::INT
        ),
        3, (unix_ts_ms >> 16)::INT
      ),
      4, (unix_ts_ms >> 8)::INT
    ),
    5, unix_ts_ms::INT
  );
  uuid_bytes = SET_BYTE(uuid_bytes, 6, (GET_BYTE(uuid_bytes, 6) & 15) | 112);
  uuid_bytes = SET_BYTE(uuid_bytes, 8, (GET_BYTE(uuid_bytes, 8) & 63) | 128);
  RETURN ENCODE(uuid_bytes, 'hex')::UUID;
END;
$$ LANGUAGE plpgsql VOLATILE;
```

### 4.4 Auto-Update Timestamp Trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column
-- (applied per-table in respective migration files)
```

### 4.5 Profile Auto-Creation Trigger

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, phone_verified, locale)
  VALUES (
    NEW.id,
    NEW.phone,
    TRUE,
    COALESCE(NEW.raw_user_meta_data->>'locale', 'tr-TR')
  );
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 4.6 Seed Reference Data

```sql
-- 20260629000017_seed_reference_data.sql

-- Vehicle makes (cars — top 30 in Turkey)
INSERT INTO marketplace.vehicle_makes (name, slug, category, country, sort_order) VALUES
  ('Toyota', 'toyota', 'car', 'JP', 1),
  ('Volkswagen', 'volkswagen', 'car', 'DE', 2),
  ('Renault', 'renault', 'car', 'FR', 3),
  ('Fiat', 'fiat', 'car', 'IT', 4),
  ('Hyundai', 'hyundai', 'car', 'KR', 5),
  ('Ford', 'ford', 'car', 'US', 6),
  ('Honda', 'honda', 'car', 'JP', 7),
  ('BMW', 'bmw', 'car', 'DE', 8),
  ('Mercedes-Benz', 'mercedes-benz', 'car', 'DE', 9),
  ('Audi', 'audi', 'car', 'DE', 10),
  ('Peugeot', 'peugeot', 'car', 'FR', 11),
  ('Opel', 'opel', 'car', 'DE', 12),
  ('Skoda', 'skoda', 'car', 'CZ', 13),
  ('Dacia', 'dacia', 'car', 'RO', 14),
  ('Citroën', 'citroen', 'car', 'FR', 15),
  ('Nissan', 'nissan', 'car', 'JP', 16),
  ('Kia', 'kia', 'car', 'KR', 17),
  ('Volvo', 'volvo', 'car', 'SE', 18),
  ('Seat', 'seat', 'car', 'ES', 19),
  ('Mazda', 'mazda', 'car', 'JP', 20),
  ('Tesla', 'tesla', 'car', 'US', 21),
  ('Chery', 'chery', 'car', 'CN', 22),
  ('MG', 'mg', 'car', 'CN', 23),
  ('Togg', 'togg', 'car', 'TR', 24);

-- Motorcycle makes
INSERT INTO marketplace.vehicle_makes (name, slug, category, country, sort_order) VALUES
  ('Honda', 'honda-moto', 'motorcycle', 'JP', 1),
  ('Yamaha', 'yamaha', 'motorcycle', 'JP', 2),
  ('Kawasaki', 'kawasaki', 'motorcycle', 'JP', 3),
  ('Suzuki', 'suzuki-moto', 'motorcycle', 'JP', 4),
  ('BMW', 'bmw-moto', 'motorcycle', 'DE', 5),
  ('KTM', 'ktm', 'motorcycle', 'AT', 6),
  ('Ducati', 'ducati', 'motorcycle', 'IT', 7),
  ('Harley-Davidson', 'harley-davidson', 'motorcycle', 'US', 8),
  ('Bajaj', 'bajaj', 'motorcycle', 'IN', 9),
  ('Mondial', 'mondial', 'motorcycle', 'TR', 10),
  ('RKS', 'rks', 'motorcycle', 'TR', 11),
  ('Arora', 'arora', 'motorcycle', 'TR', 12);

-- Paid listing packages
INSERT INTO commerce.paid_listing_packages (name, slug, tier, duration_days, price_amount, features, translations) VALUES
  ('Standart Öne Çıkar', 'standard-3d', 'standard', 3, 9900,
   '["search_boost", "badge_standard"]',
   '{"tr": {"name": "Standart Öne Çıkar"}, "en": {"name": "Standard Boost"}}'),
  ('Premium Vitrin', 'premium-7d', 'premium', 7, 19900,
   '["search_boost", "homepage_featured", "badge_premium"]',
   '{"tr": {"name": "Premium Vitrin"}, "en": {"name": "Premium Showcase"}}'),
  ('Acil Satılık', 'urgent-5d', 'urgent', 5, 14900,
   '["search_boost", "urgent_badge", "push_notification"]',
   '{"tr": {"name": "Acil Satılık"}, "en": {"name": "Urgent Sale"}}'),
  ('Spotlight', 'spotlight-14d', 'spotlight', 14, 49900,
   '["search_top", "homepage_hero", "badge_spotlight", "social_share"]',
   '{"tr": {"name": "Spotlight"}, "en": {"name": "Spotlight"}}');

-- Subscription plans
INSERT INTO commerce.subscription_plans (name, slug, tier, price_amount, billing_interval, listing_quota, features) VALUES
  ('Dealer Basic', 'dealer-basic', 'basic', 200000, 'monthly', 25,
   '["dealer_badge", "basic_analytics", "bulk_upload_50"]'),
  ('Dealer Pro', 'dealer-pro', 'pro', 500000, 'monthly', 100,
   '["dealer_badge", "advanced_analytics", "bulk_upload_unlimited", "lead_crm", "priority_support"]'),
  ('Dealer Enterprise', 'dealer-enterprise', 'enterprise', 2500000, 'monthly', 500,
   '["dealer_badge", "full_analytics", "api_access", "dedicated_manager", "custom_branding"]');
```

---

## 5. Authentication Configuration

### 5.1 Phone Auth Setup

Supabase Dashboard → Authentication → Providers → Phone:

```
Enable Phone Provider: Yes
SMS Provider: Twilio (dev) / Custom Hook (prod with Netgsm)

Twilio (Development):
  Account SID: AC...
  Auth Token: ...
  Message Service SID: MG...

Custom SMS Hook (Production — Netgsm):
  Hook URL: https://api.otoyali.com/functions/v1/auth-send-sms
  Hook Secret: (generated)
```

### 5.2 Custom SMS Hook (Netgsm)

```typescript
// supabase/functions/auth-send-sms/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  const { phone, token } = await req.json();

  const response = await fetch("https://api.netgsm.com.tr/sms/send/get", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      usercode: Deno.env.get("NETGSM_USERCODE"),
      password: Deno.env.get("NETGSM_PASSWORD"),
      gsmno: phone.replace("+", ""),
      message: `OTOYALI doğrulama kodunuz: ${token}. Bu kodu kimseyle paylaşmayın.`,
      msgheader: "OTOYALI",
    }),
  });

  if (!response.ok) {
    return new Response(JSON.stringify({ error: "SMS send failed" }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
```

### 5.3 Auth Policies

```
Settings → Authentication → Policies:
  Minimum password length: N/A (phone auth)
  Enable email confirmations: No (phone-first)
  Enable phone confirmations: Yes
  OTP expiry: 60 seconds
  OTP length: 6 digits
  Max OTP attempts: 5 per hour per phone
  Enable anonymous sign-ins: No
  Enable manual linking: No
```

### 5.4 JWT Custom Claims

```sql
-- Add custom claims to JWT via auth hook
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB AS $$
DECLARE
  claims JSONB;
  user_profile RECORD;
BEGIN
  SELECT user_type, locale INTO user_profile
  FROM public.profiles
  WHERE id = (event->>'user_id')::UUID;

  claims := event->'claims';
  claims := jsonb_set(claims, '{user_type}', to_jsonb(user_profile.user_type));
  claims := jsonb_set(claims, '{locale}', to_jsonb(user_profile.locale));

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 6. Storage Configuration

### 6.1 Bucket Setup

```sql
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('listing-images', 'listing-images', true, 10485760,
   ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('listing-images-processed', 'listing-images-processed', true, 5242880,
   ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('user-avatars', 'user-avatars', true, 2097152,
   ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('documents', 'documents', false, 52428800,
   ARRAY['application/pdf', 'image/jpeg', 'image/png']),
  ('media-uploads-temp', 'media-uploads-temp', false, 10485760,
   ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('exports', 'exports', false, 104857600,
   ARRAY['text/csv', 'application/json']);
```

### 6.2 Storage RLS Policies

```sql
-- Listing images: authenticated users upload to temp, public read on processed
CREATE POLICY "Users upload to temp"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media-uploads-temp' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read listing images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id IN ('listing-images', 'listing-images-processed'));

CREATE POLICY "Users manage own avatars"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'user-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users read own documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
```

### 6.3 Storage Trigger — Media Processing

```sql
-- Trigger Edge Function on temp upload
CREATE OR REPLACE FUNCTION integration.trigger_media_process()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.settings.edge_function_url') || '/media-process',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'bucket', NEW.bucket_id,
      'path', NEW.name,
      'user_id', (storage.foldername(NEW.name))[1]
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 7. Edge Functions Setup

### 7.1 Project Structure

```
supabase/functions/
├── _shared/                          # Shared utilities
│   ├── cors.ts                       # CORS headers
│   ├── auth.ts                       # JWT validation helper
│   ├── response.ts                   # Standard response envelope
│   ├── validation.ts                 # Zod schemas
│   ├── rate-limit.ts                 # Redis rate limiter
│   ├── supabase-client.ts            # Service role client
│   ├── llm-gateway.ts                # LLM routing
│   ├── i18n.ts                       # Error message localization
│   └── types.ts                      # Shared TypeScript types
│
├── listing-create/index.ts
├── listing-search/index.ts
├── listing-publish/index.ts
├── ai-assistant/index.ts
├── ai-valuation/index.ts
├── ai-search/index.ts
├── ai-listing-generate/index.ts
├── vin-decode/index.ts
├── vin-history/index.ts
├── payment-webhook/index.ts
├── paid-listing-purchase/index.ts
├── paid-listing-packages/index.ts
├── financing-calculate/index.ts
├── insurance-quote/index.ts
├── conversation-start/index.ts
├── message-send/index.ts
├── media-process/index.ts
├── media-upload-url/index.ts
├── auth-send-sms/index.ts
├── notification-dispatch/index.ts
├── dealer-bulk-upload/index.ts
├── dealer-analytics/index.ts
└── fraud-check/index.ts
```

### 7.2 Shared Response Helper

```typescript
// supabase/functions/_shared/response.ts
import { corsHeaders } from "./cors.ts";

export function successResponse(data: unknown, meta?: Record<string, unknown>, status = 200) {
  return new Response(
    JSON.stringify({
      success: true,
      data,
      meta: {
        request_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        ...meta,
      },
    }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

export function errorResponse(
  code: string,
  message: string,
  messageEn: string,
  status = 400,
  details?: unknown[]
) {
  return new Response(
    JSON.stringify({
      success: false,
      error: { code, message, message_en: messageEn, details, request_id: crypto.randomUUID() },
    }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```

### 7.3 Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy --project-ref {project-ref}

# Deploy single function
supabase functions deploy ai-valuation --project-ref {project-ref}

# Set secrets
supabase secrets set OPENAI_API_KEY=sk-... --project-ref {project-ref}
```

---

## 8. Realtime Configuration

### 8.1 Enable Realtime on Tables

```sql
-- Enable realtime for messaging and notifications
ALTER PUBLICATION supabase_realtime ADD TABLE messaging.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE messaging.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE messaging.conversations;

-- Enable realtime for listing updates (price changes, status)
ALTER PUBLICATION supabase_realtime ADD TABLE marketplace.listings;
```

### 8.2 Realtime RLS

Realtime respects RLS policies. Ensure messaging RLS policies are correct (see SECURITY.md).

### 8.3 Realtime Limits

| Plan | Concurrent Connections | Messages/sec |
|------|----------------------|--------------|
| Pro | 500 | 100 |
| Enterprise | 10,000+ | 1,000+ |

---

## 9. Row Level Security Setup

See [SECURITY.md](./SECURITY.md) for complete RLS policy catalog.

### 9.1 Enable RLS on All Tables

```sql
-- Run for EVERY user-facing table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.listing_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE commerce.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial.financing_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial.insurance_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.assistant_sessions ENABLE ROW LEVEL SECURITY;
-- ... all tables
```

### 9.2 Service Role Bypass

Edge Functions use `service_role` key for operations that bypass RLS (admin tasks, background jobs). Never expose service role key to clients.

---

## 10. Extensions & PostgreSQL Configuration

### 10.1 PostgreSQL Configuration (Production)

```
# Supabase Dashboard → Settings → Database → Configuration

max_connections = 200
shared_buffers = 256MB (scale with plan)
work_mem = 16MB
maintenance_work_mem = 128MB
effective_cache_size = 768MB
random_page_cost = 1.1 (SSD)
default_statistics_target = 100
log_min_duration_statement = 1000 (log queries > 1s)
```

### 10.2 pg_cron Jobs

```sql
-- Scheduled jobs
SELECT cron.schedule('expire-listings', '0 * * * *',
  $$UPDATE marketplace.listings SET status = 'expired', updated_at = NOW()
    WHERE status = 'active' AND expires_at < NOW()$$);

SELECT cron.schedule('cleanup-temp-uploads', '0 3 * * 0',
  $$SELECT integration.cleanup_orphan_temp_uploads()$$);

SELECT cron.schedule('aggregate-daily-metrics', '5 0 * * *',
  $$SELECT analytics.compute_daily_metrics(CURRENT_DATE - 1)$$);

SELECT cron.schedule('create-listing-partitions', '0 0 1 * *',
  $$SELECT marketplace.create_monthly_partition('listings', CURRENT_DATE + INTERVAL '1 month')$$);

SELECT cron.schedule('reindex-search-vectors', '0 4 * * 0',
  $$REINDEX INDEX CONCURRENTLY marketplace.idx_listings_search$$);
```

---

## 11. Secrets Management

### 11.1 Secret Storage Hierarchy

| Secret Type | Storage | Access |
|-------------|---------|--------|
| Supabase service role key | Supabase Vault + GitHub Secrets | Edge Functions only |
| API keys (OpenAI, iyzico) | Supabase Edge Function secrets | Edge Functions only |
| Client anon key | FlutterFlow env vars (public) | Client apps |
| Database password | Supabase Vault | CI/CD, admin only |
| JWT secret | Supabase managed | Supabase internal |

### 11.2 Secret Rotation Schedule

| Secret | Rotation | Method |
|--------|----------|--------|
| Service role key | 90 days | Supabase dashboard regenerate |
| API keys | 180 days | Provider dashboard |
| JWT secret | Supabase managed | Automatic |
| Database password | 90 days | Supabase dashboard |
| Webhook secrets | 180 days | Manual regenerate |

---

## 12. Local Development Setup

### 12.1 Prerequisites

```bash
# Required tools
node >= 18
docker desktop
supabase CLI >= 1.150
flutter >= 3.16
dart >= 3.2
```

### 12.2 Initialize Local Supabase

```bash
# Clone repository
git clone https://github.com/otoyali/otoyali-platform.git
cd otoyali-platform

# Start local Supabase (Docker required)
supabase start

# Output:
#   API URL: http://localhost:54321
#   DB URL: postgresql://postgres:postgres@localhost:54322/postgres
#   Studio URL: http://localhost:54323
#   Anon key: eyJ...
#   Service role key: eyJ...

# Apply migrations
supabase db reset  # drops, migrates, and seeds

# Serve Edge Functions locally
supabase functions serve --env-file supabase/.env.local

# Run tests
deno test supabase/functions/_shared/ --allow-all
```

### 12.3 Local Environment File

```bash
# supabase/.env.local
ENVIRONMENT=development
OPENAI_API_KEY=sk-...
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
IYZICO_API_KEY=sandbox-...
IYZICO_SECRET_KEY=sandbox-...
IYZICO_BASE_URL=https://sandbox-api.iyzipay.com
```

### 12.4 FlutterFlow Local Connection

```
FlutterFlow → Settings → Supabase
  Project URL: http://localhost:54321
  Anon Key: (from supabase start output)

Note: Phone auth in local dev uses Supabase default test OTP: 123456
```

---

## 13. CI/CD Integration

### 13.1 GitHub Actions Workflow

```yaml
# .github/workflows/supabase-deploy.yml
name: Deploy Supabase

on:
  push:
    branches: [main, develop]
    paths:
      - 'supabase/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: supabase/setup-cli@v1

      - name: Deploy migrations
        run: supabase db push --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}

      - name: Deploy Edge Functions
        run: supabase functions deploy --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Run migration tests
        run: supabase test db
```

### 13.2 Migration Review Process

1. Developer creates migration locally: `supabase migration new description`
2. Test locally: `supabase db reset`
3. PR opened → CI runs migration against staging
4. PR reviewed by 2 engineers (schema changes require DBA review)
5. Merge to develop → auto-deploy staging
6. Merge to main → manual promote to production

---

## 14. Monitoring & Maintenance

### 14.1 Supabase Dashboard Monitoring

| Metric | Alert Threshold | Action |
|--------|----------------|--------|
| Database size | >70% of plan limit | Upgrade plan or archive |
| Active connections | >80% of max | Investigate connection leaks |
| API response time | p95 > 500ms | Query optimization |
| Edge Function errors | >1% error rate | Check logs, fix |
| Storage usage | >80% of plan limit | Cleanup orphans, upgrade |
| Auth failures | >5% of attempts | Check SMS provider |

### 14.2 Database Maintenance

```sql
-- Weekly: vacuum and analyze
VACUUM ANALYZE marketplace.listings;
VACUUM ANALYZE messaging.messages;
VACUUM ANALYZE analytics.events;

-- Monthly: check index bloat
SELECT schemaname, tablename, indexname, pg_size_pretty(pg_relation_size(indexrelid))
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- Quarterly: partition maintenance
SELECT marketplace.drop_old_partitions('analytics.events', INTERVAL '90 days');
```

---

## 15. Scaling Configuration

### 15.1 Compute Upgrade Triggers

| Trigger | Action |
|---------|--------|
| Database CPU > 70% sustained | Upgrade compute tier |
| Connection pool exhausted | Increase pool size + read replica |
| Edge Function cold starts > 2s | Upgrade to always-warm |
| Storage egress > plan limit | CDN optimization + R2 migration |

### 15.2 Read Replica Setup (Phase 2+)

```
Supabase Dashboard → Settings → Infrastructure → Read Replicas
  Add replica in eu-central-1 (same region)
  Use for: search queries, analytics reads, listing browse
  Connection string: postgresql://...@read-replica.{ref}.supabase.co
```

### 15.3 Connection Pooling

```
# PgBouncer (built into Supabase)
Transaction mode: For Edge Functions (short transactions)
Session mode: For migrations and admin tasks

Pool sizes:
  Dev: 15
  Staging: 30
  Production: 50 (direct) + read replica pool 30
```

---

## Document References

| Document | Purpose |
|----------|---------|
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Full schema definition |
| [SECURITY.md](./SECURITY.md) | RLS policies and security |
| [API_DESIGN.md](./API_DESIGN.md) | API endpoints |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | Architecture context |
| [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md) | Development standards |

---

*Supabase is the foundation. Configure it correctly once, and it scales with the platform.*
