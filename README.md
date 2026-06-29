# OTOYALI — Technical Blueprint

**Domain:** [otoyali.com](https://otoyali.com)  
**Version:** 1.0.0  
**Last Updated:** 2026-06-29

---

## Overview

OTOYALI is Turkey's AI-first automotive super-app — a unified digital ecosystem for buying, selling, and managing vehicles, spare parts, and automotive services.

**Stack:** FlutterFlow (Flutter) · Supabase · PostgreSQL · Edge Functions · AI/ML

**Scale Target:** 100M+ registered users

---

## Documentation Index

| # | Document | Description |
|---|----------|-------------|
| 1 | [PRODUCT_VISION.md](./PRODUCT_VISION.md) | Product vision, personas, business model, competitive strategy |
| 2 | [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | High-level architecture, scaling strategy, infrastructure |
| 3 | [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Complete PostgreSQL schema (85+ tables, enums, RLS, partitioning) |
| 4 | [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md) | AI assistant, valuation, search, fraud detection, MLOps |
| 5 | [ROADMAP.md](./ROADMAP.md) | 4-phase delivery plan (2026 Q3 — 2028) |
| 6 | [API_DESIGN.md](./API_DESIGN.md) | REST API contracts, Edge Functions, Partner API, Webhooks |
| 7 | [FLUTTERFLOW_STRUCTURE.md](./FLUTTERFLOW_STRUCTURE.md) | Frontend app structure, pages, components, custom code |
| 8 | [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) | Backend provisioning, auth, storage, Edge Functions setup |
| 9 | [SECURITY.md](./SECURITY.md) | Security architecture, KVKK compliance, RLS policies |
| 10 | [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md) | Engineering standards, Git workflow, testing, review process |

---

## Quick Reference

### Product Verticals
Cars · Motorcycles · Commercial Vehicles · Spare Parts · Services · News

### AI Capabilities
AI Assistant · AI Valuation · AI Search · AI Listing Generator · VIN Intelligence · Fraud Detection

### Financial Services
Financing · Insurance · Paid Listings · Dealer Subscriptions · Escrow (Phase 3)

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Flutter 3.x / FlutterFlow |
| Backend | Supabase (Auth, DB, Storage, Edge Functions) |
| Database | PostgreSQL 15+ with pgvector, PostGIS |
| Search | Elasticsearch 8.x |
| Cache | Redis (Upstash) |
| AI/LLM | OpenAI GPT-4o, Anthropic Claude |
| ML | XGBoost, LightGBM (valuation, fraud) |
| Payments | iyzico |
| CDN/WAF | Cloudflare |
| Monitoring | Grafana Cloud |

### Languages
Turkish (default) · English (secondary)

### Authentication
Phone OTP (primary) · MFA for dealers (Phase 2)

---

## Getting Started

1. Read [PRODUCT_VISION.md](./PRODUCT_VISION.md) for product context
2. Read [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) for technical overview
3. Follow [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) to provision backend
4. Follow [FLUTTERFLOW_STRUCTURE.md](./FLUTTERFLOW_STRUCTURE.md) to set up frontend
5. Follow [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md) for coding standards
6. Check [ROADMAP.md](./ROADMAP.md) for current phase priorities

---

*This blueprint is the single source of truth for OTOYALI technical foundation. All implementation must align with these documents.*
