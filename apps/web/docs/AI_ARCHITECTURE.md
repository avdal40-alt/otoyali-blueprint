# AI Architecture

AI-01 adds the provider-independent assistant foundation for OTOYALI.

The assistant may be branded as Rif, but AI-01 does not finalize the product name or DOMAIN-01. The current implementation is an internal UX and architecture foundation only.

## Current Scope

AI-01 provides:

- A reusable assistant launcher and panel.
- A secure JSON endpoint at `POST /api/ai/assistant`.
- Strict internal request and response types.
- A provider-neutral `AiProvider` interface.
- A deterministic local provider for safe UX testing.
- A disabled provider fallback.
- Central intents, AI capabilities, safety rules, context minimization, and action URL allowlists.
- Turkish and English UI copy through the WEB-11 dictionary layer.

AI-01 does not provide real generative AI, valuation, accident history, TRAMER/VIN lookup, seller verification, personalized recommendations, persistent chat, or external model calls.

## Current Structure

```text
src/features/ai/
  domain/
    actions.ts
    capabilities.ts
    context.ts
    intents.ts
    limits.ts
    safety.ts
    suggestions.ts
    types.ts
  providers/
    disabled-provider.ts
    local-provider.ts
    provider.ts
    provider-registry.ts
  services/
    assistant-service.ts
    observability.ts
    prompt-builder.ts
    request-validator.ts
    response-normalizer.ts
  components/
    AssistantRoot.tsx
    AssistantPanel.tsx
    AssistantMessage.tsx
    AssistantSuggestions.tsx
    AssistantDisclaimer.tsx
  hooks/
    useAssistant.ts
```

## Provider Interface

Providers implement:

```ts
type AiProvider = {
  id: "local" | "disabled";
  isAvailable(): boolean | Promise<boolean>;
  getCapabilities(): AiCapabilityId[];
  generate(request: AiRequest): Promise<AiResponse>;
};
```

Future providers such as OpenAI, Gemini, Anthropic, local models, or provider routers must normalize their output into `AiResponse`. Provider-specific SDK response shapes must not leak into UI components.

## Providers

### Local deterministic provider

`local-provider.ts` is deterministic and makes no external requests. It can provide:

- Assistant intro and current limitation explanation.
- Search filter guidance.
- Listing review guidance without inventing facts.
- Publishing checklist guidance.
- Trust and safety checklist guidance.
- Service marketplace guidance without inventing providers, availability, bookings, or prices.
- BOOKING-01A explanations without creating, confirming, cancelling, rescheduling, or inventing bookings.

It must not claim access to TRAMER, VIN databases, market-wide pricing data, accident history, seller verification, or mechanical/legal certainty.

### Disabled provider

`disabled-provider.ts` returns a localized unavailable response. Provider selection falls back to disabled mode when configuration is invalid or disabled.

## Configuration

Server-only config lives in `src/features/ai/config.ts`.

Supported future variables are documented but not required:

- `AI_ENABLED`
- `AI_PROVIDER`
- `AI_MODEL`
- `AI_DEBUG`

No placeholder secrets are committed. No `NEXT_PUBLIC_*` AI secret is used. With no AI variables present, the app uses safe local preview mode.

## Request And Response Model

`AiRequest` contains:

- `requestId`
- `locale`
- `intent`
- `userMessage`
- capped `conversation`
- minimized `context`
- `vertical`
- `surface`
- server-derived guest `userState`
- safe metadata such as user-agent and content length

`AiResponse` contains:

- `status`
- text message
- optional structured data
- optional allowlisted actions
- warnings
- provider id
- latency
- safe error code/message

Statuses:

- `success`
- `unavailable`
- `unsupported`
- `needs_clarification`
- `blocked`
- `error`

## Intents

Central intents live in `domain/intents.ts`:

- `general_help`
- `search_vehicles`
- `compare_vehicles`
- `explain_listing`
- `interpret_price`
- `improve_listing`
- `publishing_help`
- `trust_and_safety`
- `ownership_guidance`
- `unsupported`

Each intent has localized keys, supported verticals, context expectations, authentication requirement, current availability, capability mapping, and safety category.

## Capabilities

AI capabilities are separate from marketplace vertical capabilities:

- `assistant_chat`
- `natural_language_search`
- `listing_explanation`
- `vehicle_comparison`
- `price_interpretation`
- `listing_copy_improvement`
- `publishing_assistance`
- `trust_guidance`
- `ownership_assistance`

Current lifecycle:

- `assistant_chat`: local preview
- `trust_guidance`: local preview
- `publishing_assistance`: local preview for cars only
- model-dependent capabilities: planned

## Context Model

Context is built from safe route state only:

- surface
- locale
- vertical from the WEB-12 registry
- safe current route with allowlisted query keys
- listing id on listing pages
- safe search query keys on search pages
- publishing vertical on sell pages
- service category, provider slug, city, and district on service pages

Do not include:

- phone numbers
- emails
- access tokens
- refresh tokens
- Supabase session objects
- hidden moderation notes
- private admin data
- service-role credentials
- full media galleries
- private seller identifiers
- provider applications
- service provider phone/contact details unless explicitly public
- service moderation notes
- unpublished service offerings
- draft or unpublished data

AI-01 does not fetch listing details for the assistant. This is intentional data minimization.

## Action Allowlist

Assistant actions are normalized in `domain/actions.ts`.

Allowed actions are internal route actions such as:

- open search
- open sell
- open trust center
- view listing
- login
- open service marketplace
- open service application page

Every action href must be:

- internal
- not protocol-relative
- not `javascript:`
- not `data:`
- not external
- route-family allowlisted
- limited to safe query keys
- locale-aware through `localizePath`

Providers must never directly control arbitrary links.

## Service Marketplace Context

SERVICE-01 adds service assistant surfaces:

- `service_marketplace`
- `service_provider`

The deterministic provider may explain service categories and current limitations. It must not book appointments, invent provider availability, invent prices, diagnose repairs with certainty, or claim a provider is verified beyond public fields.

## Server Boundary

`POST /api/ai/assistant` was selected because this project has no existing server-action pattern and a JSON route handler is the smallest stable transport boundary for future mobile/web clients.

The route handler:

- validates JSON
- caps content length
- caps message length
- caps conversation length
- caps context size
- normalizes locale and vertical
- rejects malformed requests
- rejects unsupported intents/verticals safely
- never accepts provider choice from the browser
- never exposes credentials
- returns normalized JSON
- avoids stack traces
- performs no URL fetching
- performs no tool execution
- performs no dynamic code execution

## Rate-Limit Readiness

AI-01 does not add an external rate-limit service and does not claim distributed rate limiting.

Current protections:

- max request bytes
- max user message length
- max conversation messages
- max context bytes
- malformed payload rejection

Future per-IP/per-user rate limiting should be inserted before `generateAssistantResponse` in the route handler.

## Safety Rules

Central policy in `domain/safety.ts` covers:

- no invented listing facts
- no invented vehicle history
- no fake database access
- no safety guarantee
- no fair-price guarantee
- no seller trust guarantee
- no legal certification
- no mechanical diagnosis
- no insurance quote without a real provider
- no financial guarantee
- no bypassing marketplace security
- no private seller/admin data exposure

Responses should distinguish general guidance from unavailable information.

## Privacy Rules

- Collect minimum context.
- Do not send secrets.
- Do not send hidden moderation data.
- Do not store conversations in AI-01.
- No external AI provider is connected.
- Future provider activation requires privacy review.
- Future logging of user content must be explicitly approved.
- Future retention must be documented.
- No tracking cookies are added.

## Observability

`services/observability.ts` defines safe event shapes:

- `assistant_request_started`
- `assistant_request_completed`
- `assistant_request_failed`
- future UI events such as opened, cleared, and action clicked

No external analytics provider is connected. Raw user messages, listing descriptions, phone numbers, and tokens must not be logged by default.

## Future Provider Activation Checklist

1. Choose provider.
2. Legal/privacy review.
3. Data processing review.
4. Configure secrets server-side.
5. Add real rate limiting.
6. Define retention.
7. Add moderation.
8. Add cost limits.
9. Add timeout/retry policy.
10. Add eval/test dataset.
11. Add monitoring.
12. Roll out through a feature flag.

## Adding A Provider

1. Implement `AiProvider`.
2. Keep SDK types inside the provider file.
3. Normalize output through `normalizeAiResponse`.
4. Add provider selection in `provider-registry.ts`.
5. Add server-only config names.
6. Add tests or manual API checks for malformed output.
7. Update privacy and security docs before enabling externally.

## Adding A Capability

1. Add the capability id to `domain/types.ts`.
2. Add lifecycle and vertical support in `domain/capabilities.ts`.
3. Map relevant intents in `domain/intents.ts`.
4. Add localized dictionary copy.
5. Add safe UI affordance only if the lifecycle is available or local preview.
6. Add validation and response rendering if structured data is needed.

## Supporting A New Vertical

1. Add or update the vertical in the WEB-12 registry.
2. Reuse `MarketplaceVerticalId`; do not create a second vertical enum.
3. Add AI capability support by vertical.
4. Keep inactive verticals to general guidance only.
5. Do not claim inventory search or publishing support until the vertical has real persistence and UI.

## Intentionally Not Implemented

Future booking-enabled Rif work must follow:

understand -> propose -> preview -> explicit user confirmation -> execute -> receipt

BOOKING-01A does not add Rif booking tools. Rif may not create bookings, confirm bookings, cancel bookings, reschedule bookings, select hidden resources, or invent availability.

- OpenAI SDK
- Gemini SDK
- Anthropic SDK
- external LLM calls
- embeddings
- vector database
- RAG
- web search
- browsing
- agent tools
- autonomous actions
- database writes
- automatic listing publication
- automatic moderation
- valuation
- damage detection
- image recognition
- VIN lookup
- TRAMER lookup
- seller verification
- insurance quotes
- payments
- SMS/email/push
- voice
- persistent chat history
- personalized recommendations
- cross-user learning
- fine-tuning
