---
name: yolmod-i18n-localization
description: "Implement or review Yolmod UI localization, locale routing, language switching, translated accessibility copy, or locale-aware client/server behavior. Excludes market expansion, future-locale activation, and speculative SEO/router migrations."
---
# Yolmod internationalization and localization

Follow repository `AGENTS.md`; current user instructions override this workflow except its safety requirements.

## Activation and boundary

Use for user-facing language changes; `next-intl` server/client usage; message dictionaries and keys; localized paths; locale switching; or i18n middleware, payload, accessibility, and RTL concerns. Do not use for market expansion, activating `ru`, `ar`, or `zh-CN`, broad legacy-domain migration, or speculative router/SEO/RTL rewrites unless explicitly requested.

## Yolmod invariants

- Language and market are independent. Yolmod currently serves Turkey only: keep TRY, Turkish phone/geography, and market-specific business rules unchanged when UI language changes. Do not introduce multi-market abstractions without a concrete requirement.
- The registry contains `tr`, `en`, `ru`, `ar`, and `zh-CN`, but only released `tr` and `en` may be negotiated, routed, rendered in selectors, or loaded into public client payloads. Registry presence is not release approval.
- Turkish is the canonical, unprefixed locale (`/about`, `/servisler/basvuru`); do not introduce canonical `/tr` URLs. English uses `/en` and the established pathname mappings (`/en/services/apply`). Use `localizePath`, `getLocaleSwitchPath`, and existing locale-aware navigation helpers instead of constructing locale URLs.
- Preserve the established switch behavior: released locales only; explicit preference cookie; mapped pathname, query, and hash preservation; and the required full-document navigation. Do not replace it with soft navigation while the root provider remains request-derived.
- Keep `html lang` and direction request-derived. Arabic is future-only: prefer logical/direction-safe CSS in touched shared UI, avoid broad RTL work, and explicitly validate layout plus LTR values (phone numbers, VINs, prices, identifiers) when it is activated.
- Use domain-grouped message keys for new shared/domain UI copy and relevant accessibility copy (`aria-label`, user-facing `title`, empty/loading states, controls, form/helper text). Reuse semantically correct keys, preserve Turkish copy unless asked to change it, and do not add duplicate keys or a catch-all namespace.
- Keep Server Components server-rendered where possible; use client translation only for interaction. Scope client dictionaries to component needs and never ship full or future-locale dictionaries unnecessarily.
- Preserve existing missing-key handling: Turkish fallback plus deduplicated warning; raw keys must never reach users. Do not add a competing fallback path.
- Middleware must preserve the `/api` namespace, `/auth/callback`, maintenance mode, Turkish unprefixed routing, English `/en` routing, and future-locale containment.
- Respect the current canonical strategy. Locale activation, hreflang expansion, RTL rollout, and further domain migration are explicit staged work, not incidental localization changes.

## Implementation workflow

1. Inspect the smallest relevant component or route plus `apps/web/src/i18n/config.ts`, routing helpers, dictionary sections, and middleware only when the change touches them.
2. Keep language presentation separate from Turkey market behavior; select existing path, switch, and server/client translation patterns.
3. Localize only user-facing text introduced by the task; do not opportunistically migrate unrelated legacy UI.
4. If changing routing, switching, or middleware, preserve released-locale containment and the infrastructure routing boundaries before broadening scope.

## Verification

Run the smallest behavioral check that covers the change. As applicable, verify Turkish and English rendering, mapped routes, query/hash preservation, released-only switching, missing-key fallback, market/currency independence, and API/auth/maintenance behavior. For shared UI, check localized accessibility copy and RTL-sensitive assumptions. Do not rely on source-string assertions alone for navigation or interactive locale behavior; use the relevant runtime checks (including `test:i18n-foundation`, `test:i18n-routing`, or `test:i18n-02` when they cover the modified behavior).

## Completion report

State the locales and surfaces changed, localization/routing invariants preserved, checks run and results, and any intentionally deferred future-locale, RTL, SEO, or legacy-domain work.