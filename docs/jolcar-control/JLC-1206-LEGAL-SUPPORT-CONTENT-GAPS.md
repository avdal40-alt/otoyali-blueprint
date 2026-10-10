# JLC-1206 — Kazakhstan legal, support, and content readiness gaps

## Scope and method

This is a source-content inventory, not legal advice or approved legal copy. It records only what is present in the current web source and the release-content decisions still required for the Kazakhstan launch. No legal or regulatory requirement is asserted here.

## Current inventory

| Area | Current source coverage | Kazakhstan readiness |
| --- | --- | --- |
| Terms | A Turkish/English Yolmod Terms page exists. | Not approved or localized for Jolcar/Kazakhstan. |
| Privacy | A Turkish Yolmod Privacy page exists. | Not approved or localized for Jolcar/Kazakhstan. |
| Cookies | A Turkish Yolmod Cookie page exists. | Not approved or localized for Jolcar/Kazakhstan. |
| Marketplace rules | Turkish listing and moderation pages exist. | Not approved or localized for Jolcar/Kazakhstan. |
| Trust and safety | Turkish/English Yolmod trust guidance exists. | Needs Jolcar/Kazakhstan review; Turkey-specific references must not be carried over. |
| Support | A Turkish Yolmod contact page exposes placeholder-style `support@yolmod.com` and `legal@yolmod.com` routes. | No approved Jolcar/Kazakhstan support or legal contact ownership is recorded. |
| Brand and language | The active profile is Yolmod Turkey and the UI locales are Turkish and English. | Jolcar Kazakhstan is planned; Kazakhstan launch language/content has not been supplied or approved. |

## Blocking content to obtain and approve

All items below are blocked by **O-015** (final Kazakhstan legal/privacy/terms/support content and owner) before they can be published:

1. Approved Jolcar Kazakhstan Terms, including the responsible entity and marketplace/service boundaries supplied by the content owner.
2. Approved Jolcar Kazakhstan privacy notice, including the required data-handling disclosures, request channel, and owner.
3. Approved cookie/local-storage notice, consent approach, and any vendor/category inventory that applies to the launch configuration.
4. Approved marketplace, prohibited-content, moderation, complaint, and appeal copy for the actual Kazakhstan product flow.
5. Approved buyer/seller safety, vehicle-information, and transaction-risk guidance that does not claim unavailable integrations or guarantees.
6. Approved support model: public support and legal channels, ownership, intake path, escalation process, and supported languages.
7. Approved Kazakhstan localization and brand replacements for all public legal/support pages, metadata, footer links, and contact addresses.
8. Content-owner and legal-review sign-off, versioning, effective-date, and publication/change-notice process.

## Publication guardrails

- Do not reuse the current Turkish Yolmod pages as Kazakhstan legal copy without approval.
- Do not publish placeholder email addresses as Jolcar support or legal channels.
- Do not state Kazakhstan legal, regulatory, consent, retention, consumer-protection, or data-rights claims until supplied and approved.
- Do not represent planned trust, verification, history, payment, or support capabilities as active.

## Evidence inspected

- `apps/web/src/app/privacy/page.tsx`
- `apps/web/src/app/terms/page.tsx`
- `apps/web/src/app/cookies/page.tsx`
- `apps/web/src/app/contact/page.tsx`
- `apps/web/src/app/listing-rules/page.tsx`
- `apps/web/src/app/moderation-policy/page.tsx`
- `apps/web/src/app/trust/page.tsx`
- `apps/web/src/components/layout/MarketplaceFooter.tsx`
- `apps/web/src/lib/market.ts`
