# Product Roadmap

## Completed Stages

- WEB-06: real listing publishing, photo upload, seller profile, listing quality.
- WEB-07: OTOYALI Video at `/video`.
- WEB-08: SEO marketplace landing pages, sitemap, robots.
- WEB-09: homepage as transport platform navigation.
- PERF-01: speed, media loading rules, explicit selects, database indexes.
- WEB-10: admin and moderation foundation.
- AUTH-01: phone auth UI, admin session handling, protected route behavior.
- LEGAL-01: legal, trust, and policy pages.
- SELL-02: seller profile and listing publishing polish.
- MEDIA-01: browser-side image variants, thumbnails, and optimized media fallback.
- WEB-11: Turkish/English i18n foundation with Turkish canonical URLs and English `/en` routes.
- WEB-12: scalable marketplace vertical registry, capability model, and future vertical landing architecture.
- AI-01: provider-independent Rif assistant foundation with local deterministic guidance and disabled provider fallback.
- SERVICE-01: service marketplace foundation with service categories, providers, branches, offerings, private provider applications, public discovery, and admin/Rif readiness.
- SERVICE-01 commit `666cc00` is pushed to `origin/main`; remote Supabase migration version `20260718120000` is synchronized.
- BOOKING-01A: universal booking database/domain foundation with bookable resources, offering eligibility, booking configuration, working hours, exceptions, bookings, reservations, lifecycle timeline, safe availability RPC, and server-only TypeScript wrappers.
- SMS-01 / AUTH-02: global international phone authentication UI, shared E.164 normalization, transient OTP phone state, resend cooldown, and safe auth error categories. External production SMS provider configuration remains an operations checklist item.

## Paused

- DOMAIN-01: production domain URLs. Paused because brand/name/domain may change.

## Suggested Next Stages

1. SELL-03: owner listing edit route and rejected-listing resubmission.
2. ANALYTICS-01: product analytics.
3. MEDIA-01B: legacy image variant backfill.
4. MEDIA-02: server-side image worker, blur readiness, and moderation automation.
5. BOOKING-01B: public customer booking flow and provider booking inbox.
6. BOOKING-01C: Rif booking read/preview tools and explicit-confirmation action flow.
7. WEB-13: commercial vehicles persistence and publishing.
8. WEB-14: water vehicles persistence and publishing.
9. WEB-15: spare parts marketplace.
10. WEB-16: insurance foundation.
11. AI-02: external AI provider activation after legal/privacy/rate-limit review.
12. MOBILE-01: PWA/mobile foundation.
13. PAY-01: paid listing products.
14. DEV-02: code audit / team handoff.

## Long-Term Product Areas

- TRAMER/SBM integrations.
- Insurance records.
- Expert inspection workflows.
- Service-provider bookings, work orders, and verified service history.
- More robust price analysis.
- AI listing help through a real provider only after AI-02 activation.
- Seller verification.
- Dealer packages.
- Payments.
- Native mobile apps.

## Current Principle

Optimize for MAU and retention, not listing count. Avoid backend-heavy work unless it improves the guest-first product experience or unlocks real user workflows.
