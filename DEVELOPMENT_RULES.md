# OTOYALI — Development Rules

**Version:** 1.0.0  
**Classification:** Internal — Engineering  
**Last Updated:** 2026-06-29  
**Owner:** Engineering Leadership  
**Applies To:** All engineers, contractors, and AI coding assistants working on OTOYALI

---

## Table of Contents

1. [Purpose & Scope](#1-purpose--scope)
2. [Repository Structure](#2-repository-structure)
3. [Git Workflow](#3-git-workflow)
4. [Code Standards — TypeScript (Edge Functions)](#4-code-standards--typescript-edge-functions)
5. [Code Standards — Dart/Flutter (FlutterFlow)](#5-code-standards--dartflutter-flutterflow)
6. [Code Standards — SQL (Migrations)](#6-code-standards--sql-migrations)
7. [API Development Rules](#7-api-development-rules)
8. [Database Development Rules](#8-database-development-rules)
9. [FlutterFlow Development Rules](#9-flutterflow-development-rules)
10. [AI/ML Development Rules](#10-aiml-development-rules)
11. [Testing Requirements](#11-testing-requirements)
12. [Documentation Requirements](#12-documentation-requirements)
13. [Security Development Rules](#13-security-development-rules)
14. [Performance Rules](#14-performance-rules)
15. [Localization Rules](#15-localization-rules)
16. [Code Review Process](#16-code-review-process)
17. [Architecture Decision Records](#17-architecture-decision-records)
18. [Definition of Done](#18-definition-of-done)

---

## 1. Purpose & Scope

These rules ensure consistency, quality, and security across the OTOYALI codebase. Every engineer — human or AI — must follow these rules when contributing to the project.

**Non-negotiable rules** are marked with **MUST**.  
**Strong recommendations** are marked with **SHOULD**.  
**Optional guidance** is marked with **MAY**.

---

## 2. Repository Structure

### 2.1 Monorepo Layout

```
otoyali-platform/
├── docs/                           # Architecture documentation (this repo)
│   ├── PRODUCT_VISION.md
│   ├── SYSTEM_ARCHITECTURE.md
│   └── ...
├── supabase/                       # Backend
│   ├── migrations/                 # SQL migrations (timestamped)
│   ├── functions/                  # Edge Functions (Deno/TS)
│   │   ├── _shared/                # Shared utilities
│   │   └── {function-name}/        # One folder per function
│   ├── seed.sql                    # Dev/staging seed data
│   ├── config.toml                 # Supabase local config
│   └── tests/                      # Database tests
├── app/                            # Flutter app (FlutterFlow export)
│   ├── lib/
│   │   ├── pages/                  # FlutterFlow pages (auto-generated)
│   │   ├── components/             # FlutterFlow components (auto-generated)
│   │   ├── custom_code/            # Custom Dart code (hand-written)
│   │   ├── backend/                # Supabase integration (auto-generated)
│   │   └── flutter_flow/           # FF utilities (auto-generated)
│   ├── assets/
│   ├── test/
│   ├── ios/
│   ├── android/
│   └── web/
├── scripts/                        # Utility scripts
├── .github/
│   └── workflows/                  # CI/CD pipelines
├── openapi/                        # API specification
│   └── openapi.yaml
└── README.md
```

### 2.2 File Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| SQL migrations | `YYYYMMDDHHMMSS_description.sql` | `20260629120000_create_listings.sql` |
| Edge Functions | `kebab-case/` folder, `index.ts` entry | `ai-valuation/index.ts` |
| Shared TS modules | `kebab-case.ts` | `rate-limit.ts` |
| Dart custom code | `snake_case.dart` | `ai_chat_widget.dart` |
| FlutterFlow pages | `PascalCasePage/` | `ListingDetailPage/` |
| Test files | `{name}_test.{ext}` | `valuation_test.ts` |
| Documentation | `UPPER_SNAKE_CASE.md` | `API_DESIGN.md` |

---

## 3. Git Workflow

### 3.1 Branch Strategy

**MUST** follow Git Flow:

```
main          ← production releases only
develop       ← integration branch
feature/*     ← new features (from develop)
bugfix/*      ← bug fixes (from develop)
hotfix/*      ← production hotfixes (from main)
release/*     ← release preparation (from develop)
```

### 3.2 Branch Naming

```
feature/OTO-{ticket}-{short-description}
bugfix/OTO-{ticket}-{short-description}
hotfix/OTO-{ticket}-{short-description}

Examples:
  feature/OTO-123-ai-valuation
  bugfix/OTO-456-payment-webhook
  hotfix/OTO-789-auth-otp-rate-limit
```

### 3.3 Commit Messages

**MUST** follow Conventional Commits:

```
{type}({scope}): {description}

[optional body]

[optional footer]
```

| Type | Usage |
|------|-------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `style` | Formatting, no logic change |
| `refactor` | Code change, no feature/fix |
| `test` | Adding/updating tests |
| `chore` | Build, CI, dependencies |
| `perf` | Performance improvement |
| `security` | Security fix |

```
Examples:
  feat(listings): add AI valuation to listing create flow
  fix(auth): prevent OTP brute force with rate limiting
  docs(api): update VIN history endpoint specification
  security(rls): add policies for messaging.messages table
  chore(deps): update supabase CLI to v1.150
```

### 3.4 Pull Request Rules

**MUST:**
- Create PR against `develop` (or `main` for hotfixes)
- Fill PR template completely
- Link to ticket (OTO-XXX)
- Pass all CI checks
- Receive 1 approval (2 for schema/security changes)
- Squash merge with conventional commit message

**MUST NOT:**
- Push directly to `main` or `develop`
- Merge with failing CI
- Include unrelated changes
- Commit secrets, credentials, or `.env` files

### 3.5 PR Template

```markdown
## Summary
[What does this PR do?]

## Ticket
OTO-XXX

## Type
- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Security
- [ ] Documentation

## Changes
- [Change 1]
- [Change 2]

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] RLS policies tested (if schema change)

## Screenshots (if UI change)

## Checklist
- [ ] Follows development rules
- [ ] No secrets committed
- [ ] i18n keys added (if user-facing text)
- [ ] Error handling implemented
- [ ] Documentation updated (if API/schema change)
```

---

## 4. Code Standards — TypeScript (Edge Functions)

### 4.1 General Rules

**MUST:**
- Use TypeScript strict mode
- Validate all inputs with Zod schemas
- Use shared response helpers (`successResponse`, `errorResponse`)
- Handle CORS via shared `corsHeaders`
- Log with structured JSON (no `console.log` with string concatenation)
- Use `try/catch` with proper error responses
- Return localized error messages (TR + EN)

**MUST NOT:**
- Use `any` type (use `unknown` + type guards)
- Hardcode secrets or API keys
- Make direct SQL queries (use Supabase client)
- Return stack traces to clients
- Log PII (phone numbers, emails, names)

### 4.2 Edge Function Template

```typescript
// supabase/functions/{name}/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { authenticateRequest } from "../_shared/auth.ts";
import { successResponse, errorResponse } from "../_shared/response.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { MyInputSchema } from "../_shared/validation.ts";
import { createServiceClient } from "../_shared/supabase-client.ts";

serve(async (req: Request) => {
  // 1. CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // 2. Method check
    if (req.method !== "POST") {
      return errorResponse("METHOD_NOT_ALLOWED", "Geçersiz metod", "Method not allowed", 405);
    }

    // 3. Auth
    const { user, error: authError } = await authenticateRequest(req);
    if (authError) return authError;

    // 4. Rate limit
    const rateLimit = await checkRateLimit(`fn:${user?.id ?? req.headers.get("x-forwarded-for")}`, 60, 60);
    if (!rateLimit.allowed) {
      return errorResponse("RATE_LIMITED", "Çok fazla istek", "Too many requests", 429);
    }

    // 5. Validate input
    const body = await req.json();
    const parsed = MyInputSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("VALIDATION_ERROR", "Geçersiz istek", "Invalid request", 400, parsed.error.issues);
    }

    // 6. Business logic
    const supabase = createServiceClient();
    const result = await doBusinessLogic(supabase, parsed.data, user);

    // 7. Return
    return successResponse(result);
  } catch (err) {
    console.error(JSON.stringify({
      level: "error",
      function: "{name}",
      error: err.message,
      request_id: req.headers.get("x-request-id"),
    }));
    return errorResponse("INTERNAL_ERROR", "Bir hata oluştu", "An error occurred", 500);
  }
});
```

### 4.3 Import Rules

```typescript
// DO: Use import map for shared dependencies
import { z } from "zod";  // via import_map.json

// DO: Relative imports for _shared modules
import { corsHeaders } from "../_shared/cors.ts";

// DON'T: Import from URLs directly (use import_map.json)
// import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
```

---

## 5. Code Standards — Dart/Flutter (FlutterFlow)

### 5.1 General Rules

**MUST:**
- Write custom code only in `lib/custom_code/` directory
- Follow Dart style guide ( Effective Dart)
- Use `snake_case` for file names, `PascalCase` for classes, `camelCase` for variables
- Handle null safety properly (no `!` unless proven safe)
- Use const constructors where possible
- Localize all user-facing strings via FF i18n keys

**MUST NOT:**
- Modify FlutterFlow auto-generated files outside `custom_code/`
- Hardcode strings (use i18n keys)
- Hardcode API URLs or keys (use environment variables)
- Use `print()` for logging (use proper logging service)
- Block UI thread with synchronous operations

### 5.2 Custom Widget Template

```dart
// lib/custom_code/widgets/my_widget.dart
import '/flutter_flow/flutter_flow_theme.dart';
import '/flutter_flow/flutter_flow_util.dart';
import 'package:flutter/material.dart';

class MyWidget extends StatefulWidget {
  const MyWidget({
    super.key,
    this.width,
    this.height,
    required this.listingId,
    this.onTap,
  });

  final double? width;
  final double? height;
  final String listingId;
  final Future Function()? onTap;

  @override
  State<MyWidget> createState() => _MyWidgetState();
}

class _MyWidgetState extends State<MyWidget> {
  @override
  Widget build(BuildContext context) {
    return Container(
      width: widget.width,
      height: widget.height,
      // ...
    );
  }
}
```

### 5.3 Custom Action Template

```dart
// lib/custom_code/actions/my_action.dart
import '/backend/supabase/supabase.dart';

Future<MyResultStruct?> myAction(
  BuildContext context, {
  required String inputParam,
}) async {
  try {
    final response = await SupaFlow.client.functions.invoke(
      'my-function',
      body: {'param': inputParam},
    );

    if (response.status == 200 && response.data['success'] == true) {
      return MyResultStruct.fromMap(response.data['data']);
    }
    return null;
  } catch (e) {
    // Log error via analytics service
    return null;
  }
}
```

---

## 6. Code Standards — SQL (Migrations)

### 6.1 Migration Rules

**MUST:**
- One logical change per migration file
- Include RLS policies in the same migration as table creation
- Use `IF NOT EXISTS` / `IF EXISTS` for idempotent operations
- Add comments on complex columns and functions
- Test migration locally with `supabase db reset` before PR

**MUST NOT:**
- Modify existing migration files (create new migration instead)
- Drop columns without multi-phase migration (add → migrate → remove)
- Create tables without RLS enabled
- Use `SELECT *` in production functions
- Store money as FLOAT/REAL (use BIGINT for kuruş)

### 6.2 Multi-Phase Migration Example

```sql
-- Phase 1: Add new column (migration 001)
ALTER TABLE marketplace.listings ADD COLUMN new_field VARCHAR(100);

-- Phase 2: Backfill data (migration 002)
UPDATE marketplace.listings SET new_field = old_field WHERE new_field IS NULL;

-- Phase 3: Make NOT NULL, drop old (migration 003 — after deploy confirmed)
ALTER TABLE marketplace.listings ALTER COLUMN new_field SET NOT NULL;
ALTER TABLE marketplace.listings DROP COLUMN old_field;
```

### 6.3 SQL Style

```sql
-- DO: Explicit column lists
INSERT INTO marketplace.listings (id, seller_id, title, price_amount, category, status)
VALUES (uuid_generate_v7(), $1, $2, $3, $4, 'draft');

-- DON'T: SELECT *
SELECT id, title, price_amount, status, created_at
FROM marketplace.listings
WHERE seller_id = $1 AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- DO: Use meaningful aliases
SELECT l.id, l.title, m.name AS make_name
FROM marketplace.listings l
JOIN marketplace.vehicle_makes m ON m.id = l.make_id;

-- DO: Comment complex logic
-- Partition listings by month for query performance at scale
CREATE TABLE marketplace.listings (...) PARTITION BY RANGE (created_at);
```

---

## 7. API Development Rules

### 7.1 New Endpoint Checklist

When creating a new Edge Function endpoint:

- [ ] Input validated with Zod schema in `_shared/validation.ts`
- [ ] Authentication required (or explicitly public with rate limit)
- [ ] Rate limiting configured
- [ ] Error responses localized (TR + EN)
- [ ] Standard response envelope used
- [ ] OpenAPI spec updated in `openapi/openapi.yaml`
- [ ] API_DESIGN.md updated (if new endpoint category)
- [ ] CORS handled via shared module
- [ ] Audit log entry for sensitive operations
- [ ] Idempotency key support (for payment/write operations)

### 7.2 PostgREST Exposure Rules

**MUST:**
- Enable RLS before exposing any table via PostgREST
- Expose only necessary schemas (not `ai`, `analytics`, `integration`)
- Use column-level security for sensitive fields if needed
- Set `max_rows` appropriately (default 1000)

**MUST NOT:**
- Expose `service_role` key to clients
- Expose tables without RLS as "quick fix"
- Allow direct write access to payment/financial tables

---

## 8. Database Development Rules

### 8.1 Schema Change Rules

| Change Type | Process | Review Required |
|-------------|---------|-----------------|
| New table | Migration + RLS + indexes | 1 engineer |
| New column (nullable) | Single migration | 1 engineer |
| New column (NOT NULL) | Multi-phase migration | 2 engineers |
| Drop column | Multi-phase + confirm no usage | 2 engineers + DBA |
| Index addition | CONCURRENTLY in production | 1 engineer |
| RLS policy change | Migration + test suite | 2 engineers |
| Enum value addition | ALTER TYPE ADD VALUE | 1 engineer |
| Partition management | pg_cron automated | 1 engineer |

### 8.2 Query Performance Rules

**MUST:**
- Use indexes for all WHERE/ORDER BY columns in hot paths
- Use pagination (LIMIT/OFFSET or cursor) for list queries
- Use connection pooling (never direct connections from Edge Functions)
- Log queries exceeding 1 second (pg_stat_statements)

**MUST NOT:**
- Run unbounded SELECT queries
- Use N+1 query patterns (use JOINs or batch queries)
- Lock tables in production without CONCURRENTLY option
- Run full table scans on tables > 100K rows without index

---

## 9. FlutterFlow Development Rules

### 9.1 FlutterFlow Workflow

```
1. Design in FlutterFlow UI builder
2. Configure Supabase queries/actions in FF
3. Export code to GitHub (flutterflow branch)
4. CI merges to develop (custom_code/ protected)
5. Add custom code for complex features
6. Test locally: flutter run
7. PR review → merge → deploy
```

### 9.2 FlutterFlow Best Practices

**MUST:**
- Use FF component library for all reusable UI elements
- Configure responsive settings for all components
- Use FF backend queries for simple CRUD
- Use custom actions for Edge Function calls
- Add i18n keys for every user-visible string
- Test on all 3 platforms (iOS, Android, Web) before PR

**MUST NOT:**
- Build complex logic in FF action chains (use Edge Functions)
- Create duplicate components (check library first)
- Hardcode API URLs in FF settings (use env vars)
- Skip responsive configuration (mobile-only is not acceptable)
- Export without testing in FF preview first

### 9.3 Custom Code vs FlutterFlow Decision Matrix

| Scenario | Use FlutterFlow | Use Custom Code |
|----------|----------------|-----------------|
| CRUD page with list/detail | ✅ | — |
| Form with validation | ✅ | — |
| Simple navigation | ✅ | — |
| AI chat with streaming | — | ✅ |
| Camera/VIN scanner | — | ✅ |
| Google Maps integration | — | ✅ |
| Complex animation | — | ✅ |
| SSE/WebSocket streaming | — | ✅ |
| Offline cache | — | ✅ |
| Payment checkout (iyzico webview) | Partial | ✅ |

---

## 10. AI/ML Development Rules

### 10.1 LLM Integration Rules

**MUST:**
- Route all LLM calls through `llm-gateway.ts` shared module
- Scrub PII before sending to external LLM providers
- Use tool-use pattern (LLM orchestrates, APIs compute)
- Cache identical queries (FAQ, search parse)
- Track token usage per user/session
- Include disclaimer on all AI-generated prices/content
- Log all AI interactions for audit

**MUST NOT:**
- Send raw user PII to LLM providers
- Allow LLM to generate prices without valuation API
- Allow LLM to generate listing URLs without search API
- Store LLM API keys in client code
- Use LLM for security decisions (use rule engine + ML)

### 10.2 ML Model Rules

**MUST:**
- Version all models in MLflow
- Document training data sources and metrics
- A/B test before full deployment
- Monitor for data drift post-deployment
- Provide explainability (SHAP factors for valuation)

**MUST NOT:**
- Deploy models without offline evaluation
- Train on user data without anonymization
- Deploy without rollback capability

---

## 11. Testing Requirements

### 11.1 Test Coverage Targets

| Layer | Target | Required Tests |
|-------|--------|---------------|
| Edge Functions | 80% unit | Input validation, auth, business logic |
| SQL/RLS | 100% policy | Every RLS policy has positive + negative test |
| Custom Dart code | 70% unit | Custom actions, widgets, services |
| E2E (critical paths) | 5 flows | Auth, listing create, search, message, payment |
| API integration | All endpoints | Happy path + error cases |

### 11.2 Critical E2E Flows

**MUST** pass before every release:

1. **Auth flow:** Phone → OTP → Profile setup → Home
2. **Listing create:** Category → Photos → Details → Price → Publish
3. **Search:** Query → Results → Detail → Contact seller
4. **Messaging:** Start conversation → Send message → Receive reply
5. **Payment:** Select promotion → Pay → Verify activation

### 11.3 Test Naming

```typescript
// Edge Functions (Deno test)
Deno.test("ai-valuation: returns price for valid car input", async () => { ... });
Deno.test("ai-valuation: rejects invalid year", async () => { ... });
Deno.test("ai-valuation: requires authentication", async () => { ... });
```

```dart
// Flutter (Dart test)
test('formatPrice formats Turkish Lira correctly', () { ... });
test('validateVin rejects invalid check digit', () { ... });
```

```sql
-- Database (pgTAP)
SELECT plan(3);
SELECT is(count(*), 0::bigint, 'anon cannot read draft listings')
  FROM marketplace.listings WHERE status = 'draft';
SELECT finish();
```

---

## 12. Documentation Requirements

### 12.1 When Documentation Is Required

| Change | Documentation Required |
|--------|----------------------|
| New Edge Function | OpenAPI spec + API_DESIGN.md entry |
| New database table | DATABASE_SCHEMA.md update |
| Schema migration | Inline SQL comments |
| New FlutterFlow page | FLUTTERFLOW_STRUCTURE.md (if new section) |
| Architecture change | ADR + SYSTEM_ARCHITECTURE.md update |
| Security change | SECURITY.md update |
| New external integration | SYSTEM_ARCHITECTURE.md + SUPABASE_SETUP.md |

### 12.2 Code Documentation

**SHOULD** document:
- Complex business logic (why, not what)
- Non-obvious security decisions
- Workarounds and their reasons
- External API integration quirks

**MUST NOT** document:
- Obvious code (don't narrate what code does)
- Generated FlutterFlow code
- Temporary hacks without ticket reference

---

## 13. Security Development Rules

**MUST** (summary — see [SECURITY.md](./SECURITY.md) for full details):

- Enable RLS on every user-facing table
- Validate all inputs (Zod for Edge Functions, FF validation for forms)
- Never commit secrets (use `.env.local`, Supabase secrets, GitHub secrets)
- Never log PII
- Use parameterized queries only
- Implement rate limiting on all public endpoints
- Scrub PII before LLM calls
- Verify webhook signatures
- Use idempotency keys for payments
- Test RLS policies with positive and negative cases

---

## 14. Performance Rules

### 14.1 Latency Targets

| Operation | Target (p95) | Action if Exceeded |
|-----------|-------------|-------------------|
| Listing list (API) | < 200ms | Add cache, optimize query |
| Listing detail (API) | < 150ms | Add cache |
| Search (Edge Function) | < 300ms | Optimize ES query, add cache |
| AI valuation | < 2s | Cache, model optimization |
| AI assistant (first token) | < 1s | Model routing, streaming |
| Image upload | < 3s | Client-side compression |
| Page load (mobile) | < 2s | Lazy loading, image optimization |
| Page load (web) | < 3s | CDN, code splitting |

### 14.2 Performance Best Practices

**MUST:**
- Compress images client-side before upload (max 1200px, WebP)
- Use pagination for all list endpoints
- Cache static reference data (makes, models, cities)
- Use CDN for all media assets
- Lazy load images in lists (placeholder → load on scroll)

**MUST NOT:**
- Fetch all records without pagination
- Upload uncompressed images (>2MB)
- Make sequential API calls that could be parallel
- Block UI during network requests (show loading state)

---

## 15. Localization Rules

### 15.1 i18n Requirements

**MUST:**
- Add i18n keys for ALL user-facing text (Turkish + English)
- Use Turkish as default locale (`tr-TR`)
- Format currency as `₺1.234.567` (Turkish locale)
- Format dates per locale (29 Haziran 2026 / June 29, 2026)
- Format phone numbers as `+90 5XX XXX XX XX`
- Return localized API error messages based on `Accept-Language`

**MUST NOT:**
- Hardcode any user-visible string in code
- Assume Turkish-only users (always support English fallback)
- Concatenate translated strings (use parameterized templates)

### 15.2 i18n Key Naming

```
{screen}_{element}_{variant}

Examples:
  home_search_hint          → "Ne aramıştınız?"
  listing_price_label       → "Fiyat"
  auth_otp_sent_message     → "Doğrulama kodu gönderildi"
  error_network_message     → "Bağlantı hatası"
  common_save_button        → "Kaydet"
```

---

## 16. Code Review Process

### 16.1 Review Requirements

| Change Type | Required Reviewers | Required Checks |
|-------------|-------------------|-----------------|
| Feature | 1 engineer | CI pass, manual test |
| Bug fix | 1 engineer | CI pass, regression test |
| Schema migration | 2 engineers | CI pass, RLS test, staging deploy |
| Security change | 2 engineers + security lead | CI pass, security checklist |
| AI/ML model | 1 engineer + ML engineer | CI pass, offline eval |
| FlutterFlow UI | 1 engineer + designer | Visual review, responsive test |
| Hotfix | 1 engineer (post-merge review) | CI pass, immediate deploy |

### 16.2 Review Checklist

Reviewers **MUST** verify:

- [ ] Code follows this document's standards
- [ ] No secrets or credentials in code
- [ ] Input validation present
- [ ] Error handling complete (no unhandled exceptions)
- [ ] RLS policies correct (if schema change)
- [ ] i18n keys added (if user-facing text)
- [ ] Tests added/updated
- [ ] Documentation updated (if API/schema change)
- [ ] No unnecessary complexity or over-engineering
- [ ] Performance considerations addressed

### 16.3 Review Etiquette

- Review within 24 hours of PR creation
- Be specific: suggest code, not just problems
- Approve only if you would be comfortable deploying
- Use "Request Changes" for must-fix items, "Comment" for suggestions
- Resolve all threads before merge

---

## 17. Architecture Decision Records

### 17.1 When ADR Is Required

**MUST** create ADR for:
- New external service integration
- Database schema pattern changes
- Authentication/authorization model changes
- AI model selection or architecture changes
- Breaking API changes
- Technology stack additions

### 17.2 ADR Template

```markdown
# ADR-{number}: {Title}

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded
**Deciders:** {names}

## Context
{What is the issue that we're seeing that is motivating this decision?}

## Decision
{What is the change that we're proposing and/or doing?}

## Consequences
{What becomes easier or more difficult because of this change?}

## Alternatives Considered
{What other options were evaluated?}
```

### 17.3 ADR Location

```
docs/adr/
├── ADR-001-supabase-as-backend.md
├── ADR-002-phone-auth-primary.md
├── ADR-003-flutterflow-frontend.md
├── ADR-004-iyzico-payments.md
└── ...
```

---

## 18. Definition of Done

A task is **DONE** when ALL of the following are true:

### Feature Done Checklist

- [ ] Code implemented and follows development rules
- [ ] Unit tests written and passing
- [ ] RLS policies tested (if database change)
- [ ] i18n keys added (Turkish + English)
- [ ] Error states handled (network, validation, auth)
- [ ] Loading states implemented
- [ ] Empty states implemented
- [ ] Responsive on mobile, tablet, and desktop (if UI)
- [ ] Tested on iOS, Android, and Web (if UI)
- [ ] API documentation updated (if new endpoint)
- [ ] Schema documentation updated (if database change)
- [ ] PR approved and merged to develop
- [ ] Deployed to staging and verified
- [ ] Product owner accepted on staging

### Release Done Checklist

- [ ] All sprint features meet feature Done criteria
- [ ] E2E critical paths passing
- [ ] No P1/P2 bugs open
- [ ] Performance targets met on staging
- [ ] Security checklist passed
- [ ] Deployed to production
- [ ] Smoke test on production
- [ ] Monitoring dashboards show healthy metrics
- [ ] Release notes published

---

## Document References

| Document | Purpose |
|----------|---------|
| [PRODUCT_VISION.md](./PRODUCT_VISION.md) | Product direction |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | Architecture |
| [SECURITY.md](./SECURITY.md) | Security requirements |
| [API_DESIGN.md](./API_DESIGN.md) | API standards |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Schema conventions |
| [FLUTTERFLOW_STRUCTURE.md](./FLUTTERFLOW_STRUCTURE.md) | Frontend structure |
| [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) | Backend setup |

---

*These rules exist to move fast without breaking things. When a rule conflicts with delivering user value, raise it in #engineering — rules can evolve, but intentionally.*
