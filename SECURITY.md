# OTOYALI — Security Architecture

**Version:** 1.0.0  
**Classification:** Internal — Security  
**Last Updated:** 2026-06-29  
**Owner:** Security & Platform Engineering Team

---

## Table of Contents

1. [Security Overview](#1-security-overview)
2. [Threat Model](#2-threat-model)
3. [Authentication Security](#3-authentication-security)
4. [Authorization & Access Control](#4-authorization--access-control)
5. [Row Level Security (RLS) Policy Catalog](#5-row-level-security-rls-policy-catalog)
6. [Data Protection & Encryption](#6-data-protection--encryption)
7. [API Security](#7-api-security)
8. [Infrastructure Security](#8-infrastructure-security)
9. [Application Security](#9-application-security)
10. [Payment Security (PCI)](#10-payment-security-pci)
11. [AI & Data Privacy](#11-ai--data-privacy)
12. [KVKK Compliance (Turkish GDPR)](#12-kvkk-compliance-turkish-gdpr)
13. [Incident Response](#13-incident-response)
14. [Security Testing](#14-security-testing)
15. [Security Checklist](#15-security-checklist)

---

## 1. Security Overview

OTOYALI handles sensitive user data (phone numbers, financial applications, vehicle ownership records) and processes payments. Security is not a feature — it is the foundation of trust that enables our marketplace to operate.

### Security Principles

1. **Defense in Depth** — Multiple layers: WAF → Auth → RLS → Encryption → Audit
2. **Least Privilege** — Every actor gets minimum required permissions
3. **Zero Trust** — Verify every request, never assume internal = safe
4. **Privacy by Design** — Data minimization, purpose limitation, consent-first
5. **Secure by Default** — RLS on all tables, HTTPS everywhere, no opt-in security
6. **Transparency** — Users know what data we collect and why
7. **Fail Secure** — Errors deny access; never fail open

### Compliance Requirements

| Regulation | Scope | Status |
|------------|-------|--------|
| KVKK (Law 6698) | Personal data of Turkish residents | Required from launch |
| PCI DSS | Payment card data (via iyzico) | iyzico handles PCI; we never touch card data |
| E-Commerce Law (6563) | Online marketplace operations | Required from launch |
| Electronic Communications Law | SMS marketing, notifications | Required from launch |
| Consumer Protection Law | Distance selling, returns | Required from launch |

---

## 2. Threat Model

### 2.1 STRIDE Analysis

| Threat | Category | Vector | Mitigation |
|--------|----------|--------|------------|
| OTP interception | Spoofing | SMS hijacking, SIM swap | Rate limiting, device fingerprint, short OTP expiry |
| Account takeover | Spoofing | Stolen JWT, session hijacking | Short JWT expiry, refresh rotation, device binding |
| Fake listings | Tampering | Fraudulent vehicle listings | AI fraud detection, photo verification, VIN validation |
| Price manipulation | Tampering | Altering listing prices post-inquiry | Audit log, immutable price history |
| Data exfiltration | Information Disclosure | RLS bypass, API abuse | RLS on all tables, rate limiting, audit logging |
| User data exposure | Information Disclosure | Profile/listing data leak | RLS, field-level access control, PII scrubbing |
| Listing spam | Denial of Service | Mass listing creation | Rate limits, CAPTCHA, account verification |
| API abuse | Denial of Service | Scraping, DDoS | Cloudflare WAF, rate limiting, bot detection |
| Payment fraud | Elevation of Privilege | Stolen payment methods | iyzico 3DS, idempotency keys, amount validation |
| Admin abuse | Elevation of Privilege | Insider threat | Audit logging, dual approval, least privilege |
| Repudiation | Repudiation | "I didn't create that listing" | Audit trail, phone-verified auth |

### 2.2 Attack Surface Map

```
External Attack Surface:
├── Web App (otoyali.com)           — XSS, CSRF, injection
├── Mobile Apps (iOS/Android)       — Reverse engineering, API abuse
├── API (api.otoyali.com)           — Auth bypass, rate abuse, injection
├── Partner API                     — API key theft, data scraping
├── Edge Functions                  — Input validation, SSRF
├── Storage (CDN)                   — Unauthorized upload, hotlinking
└── SMS/OTP                         — Brute force, interception

Internal Attack Surface:
├── Supabase Dashboard              — Admin access, config changes
├── GitHub Repository               — Secret exposure, supply chain
├── CI/CD Pipeline                  — Pipeline injection, secret leak
├── Edge Function Secrets           — Secret exposure in logs
└── Database Direct Access          — SQL injection, privilege escalation
```

---

## 3. Authentication Security

### 3.1 Phone OTP Security

| Control | Implementation |
|---------|---------------|
| OTP length | 6 digits (1M combinations) |
| OTP expiry | 60 seconds |
| Max attempts | 5 per phone per hour |
| Rate limit (send) | 3 OTP requests per phone per 10 minutes |
| Rate limit (verify) | 10 attempts per IP per minute |
| Phone validation | E.164 format, Turkish mobile prefix validation (+905) |
| SIM swap detection | Flag accounts with recent phone change + high-value activity |
| Test OTP (dev only) | 123456 — disabled in staging/production |

### 3.2 JWT Security

| Property | Value | Rationale |
|----------|-------|-----------|
| Algorithm | HS256 (Supabase managed) | Standard Supabase auth |
| Access token expiry | 3600s (1 hour) | Balance security vs UX |
| Refresh token rotation | Enabled | Prevent token replay |
| Refresh token reuse interval | 10 seconds | Detect token theft |
| Custom claims | user_type, locale | Authorization without DB lookup |
| Token storage (mobile) | flutter_secure_storage | Encrypted keychain/keystore |
| Token storage (web) | httpOnly cookie (future) / memory | Prevent XSS token theft |

### 3.3 Session Security

```
Session Lifecycle:
  Login (OTP verify) → Access Token (1hr) + Refresh Token (7 days)
    │
    ├── Normal use → Auto-refresh before expiry
    ├── Logout → Invalidate refresh token server-side
    ├── Password change → Invalidate all sessions (N/A for phone auth)
    ├── Account suspension → Invalidate all sessions immediately
    └── Suspicious activity → Force re-authentication (step-up auth)
```

### 3.4 Account Security Features

| Feature | Phase | Description |
|---------|-------|-------------|
| Phone verification | P0 | Required for all accounts |
| Device fingerprint | P1 | Track known devices, alert on new |
| Login history | P1 | Show recent logins in settings |
| Account suspension | P0 | Admin can suspend with reason |
| Account deletion | P0 | KVKK right to erasure |
| MFA (TOTP) | P2 | Optional for dealers and high-value sellers |
| Biometric unlock | P1 | Face ID / fingerprint for app re-open |

---

## 4. Authorization & Access Control

### 4.1 Role Hierarchy

```
service_role (Supabase internal — bypasses RLS)
    │
admin (OTOYALI staff — via custom claims)
    │
dealer (business account — extended listing quotas)
    │
fleet (fleet manager — multi-vehicle management)
    │
authenticated (registered user — standard access)
    │
anon (unauthenticated — public read only)
```

### 4.2 Permission Matrix

| Resource | anon | authenticated | dealer | admin | service_role |
|----------|------|---------------|--------|-------|--------------|
| Active listings (read) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Own listings (CRUD) | — | ✅ | ✅ | ✅ | ✅ |
| All listings (read) | — | — | — | ✅ | ✅ |
| Any listing (update/delete) | — | — | — | ✅ | ✅ |
| Own profile (read/update) | — | ✅ | ✅ | ✅ | ✅ |
| Other profiles (read public) | — | ✅ limited | ✅ limited | ✅ | ✅ |
| Messages (own conversations) | — | ✅ | ✅ | ✅ | ✅ |
| Payments (own) | — | ✅ | ✅ | ✅ | ✅ |
| VIN history (purchase) | — | ✅ | ✅ | ✅ | ✅ |
| Reviews (create) | — | ✅ | ✅ | ✅ | ✅ |
| Admin panel | — | — | — | ✅ | ✅ |
| Moderation queue | — | — | — | ✅ | ✅ |
| Analytics (raw) | — | — | — | ✅ | ✅ |
| Bulk upload | — | — | ✅ | ✅ | ✅ |
| Partner API | — | — | — | — | ✅ (API key) |

### 4.3 Authorization Enforcement Points

```
Request → Cloudflare WAF → API Gateway Rate Limit
    → JWT Validation (Supabase Auth)
    → Edge Function Auth Check (custom claims)
    → PostgreSQL RLS (row-level)
    → Field-level filtering (application layer)
    → Audit Log
```

---

## 5. Row Level Security (RLS) Policy Catalog

### 5.1 public.profiles

```sql
-- Users read own full profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- Authenticated users read public fields of other profiles
CREATE POLICY "profiles_select_public" ON public.profiles
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- Users update own profile only
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- No direct insert (handled by auth trigger)
-- No delete (soft delete via update)
```

### 5.2 marketplace.listings

```sql
-- Public read active listings; owners read all own listings
CREATE POLICY "listings_select" ON marketplace.listings
  FOR SELECT TO authenticated, anon
  USING (
    (status = 'active' AND deleted_at IS NULL)
    OR seller_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.dealer_profiles d
      WHERE d.id = dealer_id AND d.user_id = auth.uid()
    )
  );

-- Authenticated users create listings (as seller)
CREATE POLICY "listings_insert" ON marketplace.listings
  FOR INSERT TO authenticated
  WITH CHECK (seller_id = auth.uid());

-- Owners and their dealers update
CREATE POLICY "listings_update" ON marketplace.listings
  FOR UPDATE TO authenticated
  USING (
    seller_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.dealer_profiles d
      WHERE d.id = dealer_id AND d.user_id = auth.uid()
    )
  );

-- Soft delete by owner
CREATE POLICY "listings_delete" ON marketplace.listings
  FOR DELETE TO authenticated
  USING (seller_id = auth.uid());
```

### 5.3 marketplace.listing_favorites

```sql
CREATE POLICY "favorites_select_own" ON marketplace.listing_favorites
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "favorites_insert_own" ON marketplace.listing_favorites
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "favorites_delete_own" ON marketplace.listing_favorites
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
```

### 5.4 messaging.messages

```sql
-- Only conversation participants can read messages
CREATE POLICY "messages_select_participant" ON messaging.messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM messaging.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );

-- Only participants can send messages
CREATE POLICY "messages_insert_participant" ON messaging.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM messaging.conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
        AND cp.left_at IS NULL
    )
  );
```

### 5.5 commerce.payments

```sql
-- Users see only own payments
CREATE POLICY "payments_select_own" ON commerce.payments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Payments created only via Edge Functions (service_role)
-- No direct insert/update by authenticated users
```

### 5.6 ai.assistant_sessions

```sql
CREATE POLICY "ai_sessions_select_own" ON ai.assistant_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "ai_sessions_insert" ON ai.assistant_sessions
  FOR INSERT TO authenticated, anon
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
```

### 5.7 financial.financing_applications

```sql
CREATE POLICY "financing_select_own" ON financial.financing_applications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "financing_insert_own" ON financial.financing_applications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
```

### 5.8 Admin Override Policies

```sql
-- Admin role check function
CREATE OR REPLACE FUNCTION auth.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT (auth.jwt() -> 'app_metadata' ->> 'user_type') = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin read all listings (including drafts, removed)
CREATE POLICY "listings_admin_all" ON marketplace.listings
  FOR ALL TO authenticated
  USING (auth.is_admin())
  WITH CHECK (auth.is_admin());
```

---

## 6. Data Protection & Encryption

### 6.1 Encryption at Rest

| Data | Encryption | Key Management |
|------|-----------|----------------|
| PostgreSQL database | AES-256 (Supabase managed) | Supabase AWS KMS |
| Storage buckets | AES-256 (Supabase managed) | Supabase AWS KMS |
| Backups | AES-256 encrypted | Supabase managed |
| Edge Function secrets | Encrypted vault | Supabase Vault |
| Redis cache | TLS in transit; at-rest by Upstash | Upstash managed |

### 6.2 Encryption in Transit

| Connection | Protocol | Certificate |
|------------|----------|-------------|
| Client → Cloudflare | TLS 1.3 | Cloudflare managed |
| Cloudflare → Supabase | TLS 1.3 | Supabase managed |
| Edge Functions → External APIs | TLS 1.2+ | Provider managed |
| Database connections | TLS 1.2+ | Supabase managed |
| Redis connections | TLS 1.2+ | Upstash managed |

### 6.3 PII Classification & Handling

| Data Field | Classification | Storage | Access | Retention |
|------------|---------------|---------|--------|-----------|
| Phone number | PII — High | profiles.phone | Owner + admin | Account lifetime |
| Display name | PII — Low | profiles.display_name | Public | Account lifetime |
| Email | PII — Medium | profiles.email | Owner + admin | Account lifetime |
| Location (GPS) | PII — Medium | listings.location | Public (city level) | Listing lifetime |
| VIN | Semi-public | listings.vin | Public on active listings | Listing lifetime |
| Payment card | PCI — Critical | NOT STORED | iyzico token only | N/A |
| KYC documents | PII — High | documents bucket (private) | Admin only | 5 years (legal) |
| Financing application | PII — High | financial.financing_applications | Owner + partner | 5 years (legal) |
| IP address | PII — Low | analytics.events (hashed) | Admin only | 90 days |
| AI conversations | PII — Medium | ai.assistant_messages | Owner + admin | 1 year |
| Messages | PII — Medium | messaging.messages | Participants | Account lifetime |

### 6.4 Data Minimization

- Collect only what's needed for the stated purpose
- Phone number required; email optional
- Exact GPS coordinates stored but only city/district shown publicly
- IP addresses hashed (SHA-256) before storage in analytics
- AI conversations: PII scrubbed before sending to LLM providers
- Payment data: never stored locally (iyzico tokenization)

---

## 7. API Security

### 7.1 Input Validation

All Edge Function inputs validated with Zod schemas:

```typescript
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const ListingCreateSchema = z.object({
  category: z.enum(["car", "motorcycle", "commercial"]),
  title: z.string().min(10).max(255),
  description: z.string().max(5000).optional(),
  price_amount: z.number().int().positive().max(999_999_999_99),
  make_id: z.string().uuid(),
  model_id: z.string().uuid(),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  mileage_km: z.number().int().min(0).max(9_999_999),
  vin: z.string().length(17).regex(/^[A-HJ-NPR-Z0-9]{17}$/).optional(),
  city: z.string().min(2).max(100),
});

// Validation in handler
const parsed = ListingCreateSchema.safeParse(body);
if (!parsed.success) {
  return errorResponse("VALIDATION_ERROR", "Geçersiz istek", "Invalid request", 400, parsed.error.issues);
}
```

### 7.2 SQL Injection Prevention

- PostgREST parameterized queries (automatic)
- Edge Functions use Supabase client (parameterized)
- No raw SQL string concatenation with user input
- Database functions use `$1, $2` parameterized arguments

### 7.3 XSS Prevention

- FlutterFlow/Flutter renders text safely (no HTML injection)
- Web: Content Security Policy headers via Cloudflare
- User-generated content (listing descriptions) stored as plain text, never rendered as HTML
- AI-generated content sanitized before display

### 7.4 CSRF Prevention

- API uses JWT Bearer tokens (not cookies) — CSRF not applicable for mobile/API
- Web (future cookie auth): SameSite=Strict cookies + CSRF tokens

### 7.5 SSRF Prevention

Edge Functions that call external URLs:
- Allowlist of permitted domains (Tramer, NHTSA, iyzico, OpenAI, etc.)
- Block internal IP ranges (10.x, 172.x, 192.x, 127.x, 169.254.x)
- No user-controlled URLs in server-side fetch

### 7.6 Rate Limiting Implementation

```typescript
// Redis-based sliding window rate limiter
async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;

  // Remove old entries, count current window, add new entry
  const count = await redis.zcount(key, windowStart, now);

  if (count >= limit) {
    return { allowed: false, remaining: 0, resetAt: now + windowSeconds * 1000 };
  }

  await redis.zadd(key, now, `${now}`);
  await redis.expire(key, windowSeconds);

  return { allowed: true, remaining: limit - count - 1, resetAt: now + windowSeconds * 1000 };
}
```

---

## 8. Infrastructure Security

### 8.1 Cloudflare WAF Rules

```
Rule 1: Block known bad bots (OWASP CRS)
Rule 2: Rate limit /auth/v1/otp → 5 req/min per IP
Rule 3: Rate limit /functions/v1/ai-* → 20 req/min per IP (unauthenticated)
Rule 4: Block requests from TOR exit nodes (optional, configurable)
Rule 5: Geo-block non-Turkey + allowed countries for admin endpoints
Rule 6: Challenge (CAPTCHA) on suspicious traffic patterns
Rule 7: Block SQL injection patterns in query strings
Rule 8: Block XSS patterns in request body
```

### 8.2 Network Security

| Control | Implementation |
|---------|---------------|
| HTTPS only | Cloudflare "Always Use HTTPS" + HSTS |
| TLS minimum | TLS 1.2 (prefer 1.3) |
| DNS security | DNSSEC enabled |
| DDoS protection | Cloudflare automatic + rate limiting |
| IP allowlisting | Admin endpoints restricted to office/VPN IPs |
| Supabase network | Supabase managed VPC (Enterprise) |

### 8.3 Secret Management

```
NEVER:
  ✗ Commit secrets to git
  ✗ Log secrets in Edge Function output
  ✗ Include secrets in client-side code (except anon key)
  ✗ Share service role key with frontend
  ✗ Store secrets in FlutterFlow environment (except anon key)

ALWAYS:
  ✓ Use Supabase Edge Function secrets for API keys
  ✓ Use GitHub Secrets for CI/CD credentials
  ✓ Rotate secrets on schedule
  ✓ Audit secret access
  ✓ Use .env.local (gitignored) for local development
```

### 8.4 Supply Chain Security

- Dependabot enabled on GitHub repository
- Deno dependencies pinned to specific versions in `import_map.json`
- Flutter/Dart dependencies locked in `pubspec.lock`
- No dependencies with known critical CVEs
- Weekly automated dependency audit in CI

---

## 9. Application Security

### 9.1 Secure Coding Requirements

| Area | Requirement |
|------|-------------|
| Authentication | All protected endpoints verify JWT |
| Authorization | RLS + application-level checks (defense in depth) |
| Input validation | Zod schemas on all Edge Function inputs |
| Output encoding | No raw user input in responses |
| Error handling | Generic errors to client; detailed logs server-side |
| Logging | No PII in logs; request IDs for correlation |
| File upload | MIME type validation, size limits, virus scan |
| Dependencies | Pinned versions, automated CVE scanning |

### 9.2 Content Moderation

| Content Type | Method | Action |
|-------------|--------|--------|
| Listing photos | AWS Rekognition NSFW + custom model | Auto-reject explicit |
| Listing text | LLM moderation + keyword filter | Flag for review |
| User messages | Keyword filter + AI moderation | Flag + warn user |
| Reviews | Sentiment analysis + keyword filter | Flag negative patterns |
| User profiles | Manual review (dealers) + AI (individuals) | Approve/reject |

### 9.3 Fraud Prevention Controls

| Control | Phase | Description |
|---------|-------|-------------|
| Phone verification | P0 | Required for all accounts |
| Listing price bounds | P0 | Reject if price deviates >50% from AI valuation |
| Photo duplicate detection | P1 | pHash comparison across platform |
| Velocity checks | P0 | Max 10 listings/day for individuals |
| Device fingerprint | P1 | Flag multiple accounts per device |
| AI fraud scoring | P1 | Anomaly model on all new listings |
| Manual review queue | P1 | High-value + flagged listings reviewed by human |
| Seller trust score | P1 | Visible badge based on history |

---

## 10. Payment Security (PCI)

### 10.1 PCI Scope Reduction

OTOYALI **never handles raw card data**. All payment processing delegated to iyzico (PCI DSS Level 1 certified).

```
User → OTOYALI App → iyzico Checkout Form (hosted) → iyzico → Bank
                         │
                         └── Card data never touches OTOYALI servers
```

### 10.2 Payment Flow Security

| Step | Security Control |
|------|-----------------|
| Initiate payment | JWT auth + idempotency key |
| iyzico checkout | Hosted payment page (PCI compliant) |
| 3D Secure | Required for all card payments |
| Webhook callback | HMAC signature verification |
| Payment confirmation | Idempotent processing (prevent double-charge) |
| Refund | Admin-only, audit logged, original payment reference |

### 10.3 iyzico Webhook Verification

```typescript
function verifyIyzicoWebhook(payload: string, signature: string): boolean {
  const expectedSignature = createHmac("sha256", IYZICO_SECRET_KEY)
    .update(payload)
    .digest("hex");
  return timingSafeEqual(signature, expectedSignature);
}
```

---

## 11. AI & Data Privacy

### 11.1 LLM Data Handling

| Data Sent to LLM | PII Scrubbed | Retention by Provider | Purpose |
|------------------|-------------|----------------------|---------|
| User chat message | Yes (phone, email, names) | Zero (OpenAI/Anthropic DPA) | Assistant response |
| Listing description | No (public data) | Zero | Generate/improve listing |
| VIN data | No (vehicle identifier) | Zero | Summarize history report |
| Search query | Yes (location precision reduced) | Zero | Parse search intent |

### 11.2 AI Safety Controls

- System prompt prohibits: price fabrication, legal advice, competitor promotion
- Tool-use architecture ensures prices come from valuation API, not LLM
- All AI responses logged for audit (1 year retention)
- User can opt out of AI features in settings
- AI conversations deletable on account deletion (KVKK)

### 11.3 Model Training Data

- User data **never** used to train third-party models (contractual DPA)
- Platform data used only for own ML models (valuation, fraud, search)
- Anonymized aggregate data only for model training
- Users informed in privacy policy about AI data usage

---

## 12. KVKK Compliance (Turkish GDPR)

### 12.1 Data Processing Inventory

| Data Category | Legal Basis | Purpose | Retention |
|---------------|-------------|---------|-----------|
| Phone number | Contract (Art. 5/2-c) | Authentication | Account lifetime |
| Profile data | Consent (Art. 5/1) | Service personalization | Account lifetime |
| Listing data | Contract | Marketplace service | Listing lifetime + 1 year |
| Location data | Consent | Show vehicle location | Listing lifetime |
| Payment data | Contract | Process transactions | 5 years (tax law) |
| Analytics data | Legitimate interest (Art. 5/2-f) | Improve service | 90 days |
| AI conversations | Consent | AI assistant service | 1 year |
| Marketing communications | Consent (Art. 5/1) | Send promotions | Until consent withdrawn |

### 12.2 User Rights Implementation

| Right | Implementation | Endpoint/UI |
|-------|---------------|-------------|
| Right to information | Privacy policy in app + web | Settings → Privacy Policy |
| Right of access | Export all user data | Settings → Download My Data |
| Right to rectification | Edit profile | Profile → Edit |
| Right to erasure | Delete account + all data | Settings → Delete Account |
| Right to restrict processing | Opt-out toggles | Settings → Privacy |
| Right to data portability | JSON export | Settings → Download My Data |
| Right to object | Marketing opt-out | Settings → Notifications |
| Right to withdraw consent | Toggle consent flags | Settings → Privacy |

### 12.3 Account Deletion Flow

```
User requests deletion (Settings → Delete Account)
    │
    ▼
Confirmation dialog + OTP re-verification
    │
    ▼
Edge Function: account-delete
    ├── Anonymize profile (name → "Deleted User", phone → hash)
    ├── Soft-delete all listings (status → removed)
    ├── Delete messages content (retain metadata for legal)
    ├── Delete AI conversations
    ├── Delete favorites, saved searches
    ├── Cancel active subscriptions
    ├── Delete storage files (avatars, documents)
    ├── Invalidate all sessions
    ├── Log deletion in audit trail
    └── Send confirmation SMS
    │
    ▼
30-day grace period (account recoverable)
    │
    ▼
Hard delete after 30 days (pg_cron job)
```

### 12.4 Required Documentation

| Document | Language | Location |
|----------|----------|----------|
| Privacy Policy (Gizlilik Politikası) | TR + EN | otoyali.com/gizlilik |
| Terms of Service (Kullanım Koşulları) | TR + EN | otoyali.com/kosullar |
| Cookie Policy | TR + EN | otoyali.com/cerezler |
| KVKK Disclosure (Aydınlatma Metni) | TR | otoyali.com/kvkk |
| Consent Form (Açık Rıza Metni) | TR | In-app registration |
| Data Processing Agreement (for dealers) | TR | Dealer onboarding |

### 12.5 Data Protection Officer (DPO)

- Required under KVKK for companies processing large-scale personal data
- Appoint DPO before public launch
- Register with VERBIS (Data Controllers Registry)
- DPO contact: kvkk@otoyali.com

---

## 13. Incident Response

### 13.1 Severity Levels

| Level | Description | Response Time | Example |
|-------|-------------|---------------|---------|
| P1 Critical | Active breach, data exposure | 15 minutes | Database exposed, payment fraud |
| P2 High | Vulnerability exploited, service compromised | 1 hour | Auth bypass, RLS failure |
| P3 Medium | Vulnerability discovered, not exploited | 24 hours | Dependency CVE, misconfiguration |
| P4 Low | Minor security improvement | 1 week | Missing header, log gap |

### 13.2 Incident Response Plan

```
Detect → Triage → Contain → Eradicate → Recover → Learn

1. DETECT
   ├── Automated alerts (Grafana, Supabase, Cloudflare)
   ├── User reports (support@otoyali.com)
   └── Security researcher reports (security@otoyali.com)

2. TRIAGE (15 min)
   ├── Assign incident commander
   ├── Assess severity and scope
   └── Notify stakeholders

3. CONTAIN (1 hr)
   ├── Isolate affected systems
   ├── Block malicious IPs/accounts
   ├── Rotate compromised credentials
   └── Enable maintenance mode if needed

4. ERADICATE
   ├── Fix vulnerability
   ├── Remove attacker access
   └── Patch affected systems

5. RECOVER
   ├── Restore from clean backup if needed
   ├── Verify system integrity
   └── Monitor for recurrence

6. LEARN
   ├── Post-incident review (within 48 hr)
   ├── Update runbooks
   ├── KVKK breach notification if personal data affected (72 hr)
   └── Implement preventive measures
```

### 13.3 KVKK Breach Notification

If personal data breach occurs:
1. Notify KVKK Board within **72 hours**
2. Notify affected users without undue delay
3. Document: nature of breach, data affected, measures taken, contact point

---

## 14. Security Testing

### 14.1 Testing Schedule

| Test Type | Frequency | Scope | Provider |
|-----------|-----------|-------|----------|
| SAST (static analysis) | Every PR | Code | GitHub CodeQL |
| Dependency scan | Daily | Dependencies | Dependabot |
| DAST (dynamic analysis) | Weekly | Staging API | OWASP ZAP (automated) |
| Penetration test | Pre-launch + annual | Full platform | External firm |
| RLS policy test | Every migration | Database | Automated test suite |
| Auth flow test | Every release | Auth endpoints | Automated E2E |
| Load test | Pre-major release | API + DB | k6 |

### 14.2 RLS Test Suite

```sql
-- Test: anonymous user cannot read draft listings
SET ROLE anon;
SELECT count(*) FROM marketplace.listings WHERE status = 'draft';
-- Expected: 0 rows

-- Test: user cannot read other user's payments
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "user-a-uuid"}';
SELECT count(*) FROM commerce.payments WHERE user_id != 'user-a-uuid';
-- Expected: 0 rows

-- Test: user cannot insert listing as another seller
INSERT INTO marketplace.listings (seller_id, ...) VALUES ('other-user-uuid', ...);
-- Expected: RLS violation error
```

### 14.3 Security Headers (Cloudflare)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.otoyali.com; connect-src 'self' https://api.otoyali.com
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 0 (deprecated, rely on CSP)
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(self), microphone=(), geolocation=(self)
```

---

## 15. Security Checklist

### Pre-Launch Security Checklist

- [ ] All tables have RLS enabled with tested policies
- [ ] Phone OTP rate limiting configured
- [ ] JWT expiry and refresh rotation enabled
- [ ] All Edge Functions validate input with Zod
- [ ] No secrets in client-side code or git history
- [ ] Cloudflare WAF rules active
- [ ] HTTPS enforced with HSTS
- [ ] Security headers configured
- [ ] iyzico webhook signature verification implemented
- [ ] PII scrubbing in LLM pipeline verified
- [ ] Account deletion flow tested (KVKK)
- [ ] Privacy policy and terms published (TR + EN)
- [ ] KVKK aydınlatma metni published
- [ ] VERBIS registration completed
- [ ] DPO appointed
- [ ] Penetration test completed with no critical findings
- [ ] Incident response plan documented and team trained
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery tested
- [ ] Dependency audit clean (no critical CVEs)

### Ongoing Security Checklist (Monthly)

- [ ] Review access logs for anomalies
- [ ] Rotate API keys per schedule
- [ ] Review and update RLS policies for new tables
- [ ] Dependency vulnerability scan
- [ ] Review fraud detection metrics
- [ ] Test account deletion flow
- [ ] Verify backup integrity
- [ ] Review Cloudflare WAF logs
- [ ] Update security documentation

---

## Document References

| Document | Purpose |
|----------|---------|
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Schema with RLS context |
| [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) | Auth and infrastructure config |
| [API_DESIGN.md](./API_DESIGN.md) | API security patterns |
| [AI_ARCHITECTURE.md](./AI_ARCHITECTURE.md) | AI data privacy |
| [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md) | Secure coding standards |

---

*Security is everyone's responsibility. When in doubt, choose the more secure option and ask the security team.*
