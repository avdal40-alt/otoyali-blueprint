# Yolmod Web V1.0 product specification

**Status:** Authoritative for V1 roadmap execution
**Target public Web V1.0:** 2026-12-25
**Launch market:** Turkey

This document supersedes an older implementation plan where it conflicts. The delivery order is **Marketplace → Trust → AI → Video → Convenience → Monetization**. Web V1.0 precedes native apps.

## Product guardrails

- Browsing is guest-first; phone OTP remains the primary authentication method.
- No buyer/seller WhatsApp and no vehicle-sale payment or escrow in V1.0.
- Seller phone is available only to authenticated users through the private authenticated backend facade. It is never rendered in public HTML; guests authenticate first.
- Bireysel and Galeri are distinct seller models. A Galeri must be verified before Galeri-only capabilities.
- VIN is optional and never prevents normal publication. Seller claims, catalog facts, future external reports, and AI inferences remain visibly distinct.
- Do not present AI inference as verified data or invent verification, market-price, financing, warranty, activity, inventory, or app-availability claims.

## Marketplace

### Home and search

Home provides used/new entry, compact vehicle search, make navigation, latest listings, Sell CTA, recently viewed, relevant saved searches, Video Feed entry, guides/news preview, and mobile bottom navigation.

Search is real database/server search, never browser filtering over a capped result set. The canonical filter contract covers condition; make/model/variant; price/year/mileage; İl/İlçe; fuel/transmission/body/drive/color; seller type; engine displacement and power; EV battery/range; service and body condition; Takas/Pazarlık; photo/video presence. Supported sort: newest, price ascending/descending, newest year, lowest mileage. It uses stable cursor/keyset pagination.

### Sell and listing

Selling requires an authenticated, verified phone/profile seller; price; 3–30 photos with primary image; preview/confirmation; hybrid moderation; optional VIN; Takas/Pazarlık; structured body condition; seller damage/history and service declarations. The later V1 AI assistant may assist but does not certify facts.

Listing detail includes gallery/video, price/specs/condition, seller declarations and provenance, description/seller information, favorite/share/report/similar, authenticated seller contact, internal message, Yolmod AI, and price history. The lifecycle is draft, pending, active, paused, rejected, sold, expired, archived, resubmit, republish; active target is 30 days.

Turkey body condition is per panel: **Orijinal**, **Boyalı**, **Değişen**. All-original panels do not establish externally verified “Hasarsız”. Store seller body state, seller no-damage declaration, and any future external report separately.

The existing `get_listing_seller_contact(uuid)` foundation stays authenticated-only. V1 adds UI, login return, own-listing UX, rate limiting, and lead/contact events.

### Conversations, favorites, and notifications

Internal chat is one buyer/seller/listing conversation. V1 supports text, emoji, photos, delivered/read, report, block, and safety warning; it excludes voice, video, documents, and location sharing. Favorites are persistent and prepare for price drops. Saved searches use normalized contracts, maximum five, optional AI query, and new-match notifications. Notifications cover chat, moderation, lifecycle/expiry, saved search, price drop, and account-critical events.

### Galeri and import

Galeri verification includes company identity, Vergi Levhası, Yetki Belgesi, logo, location, public profile, inventory, and analytics. Dealer launch supply requires Excel import with idempotent external listing identity, create/update/archive sync, ownership isolation, and validation/error reports. XML follows when launch feeds require it; no unauthorized mass scraping.

## Video, AI, and intelligence

Video is first-class. Initially verified Galeri may upload one primary listing video, roughly ≤60 seconds, vertical recommended, with validation, processing, thumbnail, moderation, public-ready state, and lifecycle coupling. `/video` is public vertical guest feed; auth gates favorite, chat, and seller phone. Sold/archived listings leave the active feed. Capture impression, start, 25/50/75%, completion, listing-open, favorite, and contact analytics.

Production Yolmod AI is required P0; Rif/local preview is not production AI. It is a tool-based automotive assistant for general and listing-grounded Q&A, natural-language search, 2–4 listing comparison, recommendations, sell description/completeness help, photo analysis, and later VIN/trust and price tools. AI text is constrained normalization/tool call into canonical Yolmod backend contracts, never a parallel search engine. AI knowledge and listing facts are distinct; it never invents condition, accident history, mileage, legal cleanliness, verified service history, or sale price.

Collect immutable price history from day one. Public market-price intelligence waits for representative data and validated models; remove small-sample heuristic badges from public launch semantics. Canonical provenance classes are seller, catalog, vin, external_report, and ai; AI may carry confidence but never becomes verified automatically.

## Security, legal, monetization, and measurement

Consent-aware primary KPI: successful buyer-to-seller connection, measured chiefly by phone/contact leads and meaningful chat. Also measure inventory, views, search conversion, favorites, saved searches, video conversion, sell completion, and Galeri retention.

Require OTP/chat/report/AI/upload abuse controls, adaptive CAPTCHA, server-side authorization, safe MIME/type-validated storage, EXIF/GPS removal, AI-tool permissions and prompt-injection protection, and audit/security logs. Before launch provide Terms, KVKK/Privacy, Cookie Policy, Marketplace Rules, Prohibited Content, Galeri Terms, AI Notice, Video/UGC Terms, and safety guidance; Turkish counsel reviews final wording.

Liquidity comes first. V1 has no public payment barrier. Prepare plans, entitlements, trials, promotions, dealer packages, Vitrin/Öne Çıkar/boosts/Video Highlight, but payments and billing are not launch blockers. Provider decisions (AI, SMS, video, CAPTCHA, analytics, email/push, VIN/TRAMER/SBM) remain unresolved and block only dependent stages.
