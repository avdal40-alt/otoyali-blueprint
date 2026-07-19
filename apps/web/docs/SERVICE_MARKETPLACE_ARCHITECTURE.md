# Service Marketplace Architecture

SERVICE-01 adds the foundation for the OTOYALI service marketplace. It is a real domain model, but it does not implement bookings, calendars, work orders, payments, reviews, ratings, CRM, or service history. BOOKING-01A later adds a backend-only booking foundation in the separate `booking` schema; it still does not expose customer booking UI or provider calendar UI.

## Purpose

The service marketplace is separate from vehicle listings. A `ServiceProvider` is an operating entity that may have physical `ServiceBranch` locations and branch-level `ServiceOffering` records. Public users can discover only active approved providers. Provider applications are private and require phone-authenticated users.

## Domain Entities

- `ServiceProvider`: legal or operating entity offering vehicle services.
- `ServiceBranch`: physical location belonging to a provider.
- `ServiceCategory`: standardized taxonomy such as maintenance, diagnostics, tires, inspection, and towing.
- `ServiceOffering`: service offered by a branch, with pricing mode, optional price range, duration range, booking mode, status, and supported verticals.
- `ProviderApplication`: private application from an authenticated user to join the service network.

## Database

Migration: `supabase/migrations/20260718120000_service01_service_marketplace_foundation.sql`.

Schema: `service_marketplace`.

Tables:

- `service_marketplace.categories`
- `service_marketplace.providers`
- `service_marketplace.branches`
- `service_marketplace.offerings`
- `service_marketplace.provider_applications`

Public projections:

- `public.service_public_categories`
- `public.service_public_providers`
- `public.service_public_provider_details`
- `public.service_public_offerings`

Admin projection:

- `public.service_admin_provider_applications`

The migration uses UUID primary keys, foreign keys, check constraints, timestamps, obvious indexes, RLS, and grants. It uses constrained text statuses rather than Postgres ENUMs because service lifecycle wording may evolve during provider onboarding.

## Lifecycle

Provider statuses:

- `draft`
- `pending_review`
- `active`
- `suspended`
- `rejected`
- `archived`

Branch statuses:

- `draft`
- `pending_review`
- `active`
- `temporarily_closed`
- `suspended`
- `archived`

Offering statuses:

- `draft`
- `pending_review`
- `active`
- `suspended`
- `archived`

Provider applications:

- `pending_review`
- `reviewing`
- `approved`
- `rejected`
- `archived`

An application never creates a public provider automatically. Public discovery requires provider `active`, branch `active`, and offering `active` where offerings are shown.

## Service Categories

The typed registry lives in `src/features/services/domain/categories.ts`. UI labels and descriptions live in WEB-11 dictionaries. Database rows use stable, non-localized category keys.

Initial categories include scheduled maintenance, diagnostics, engine repair, transmission, brakes, suspension, electrical, air conditioning, tires, battery, oil change, body repair, paint, glass, detailing, car wash, inspection, towing, EV service, marine service, commercial vehicle service, motorcycle service, and other.

## Pricing And Booking Modes

Pricing modes:

- `fixed`
- `starting_from`
- `range`
- `quote_required`
- `unavailable`

Booking modes:

- `request_only`
- `instant_booking_future`
- `contact_provider`
- `unavailable`

SERVICE-01 does not create appointment slots and does not guarantee prices.

## RLS Summary

Public visitors may read only:

- active categories
- active public providers
- active or temporarily closed public branches belonging to active providers
- active public offerings belonging to active providers and active branches

Authenticated users may:

- submit their own provider application
- read their own provider application
- read their assigned provider data if ownership is established later

Admins use the existing `public.is_admin(auth.uid())` pattern to review applications and manage service lifecycle rows. Moderation notes and application contact details are never exposed through public projections.

## Routes

- `/servisler`
- `/en/services`
- `/servisler/basvuru`
- `/en/services/apply`
- `/servisler/[slug]`
- `/en/services/[slug]`
- `/admin/services`

Provider application pages are `noindex`. Sitemap includes only active public provider pages from `public.service_public_providers`.

## Rif Integration

Rif understands service surfaces:

- `service_marketplace`
- `service_provider`

Safe context includes category, provider slug, city, and district only. It must not include application data, phone numbers, owner IDs, moderation notes, private documents, unpublished services, or internal pricing notes.

Current Rif behavior is deterministic guidance only. It may explain service categories and limitations. It must not book appointments, invent providers, invent prices, diagnose with certainty, or claim verification beyond public data.

## BOOKING-01A Foundation

BOOKING-01A is documented in [BOOKING_ARCHITECTURE.md](./BOOKING_ARCHITECTURE.md). It reuses the canonical SERVICE-01 provider, branch, and offering tables. It adds:

- `booking.bookable_resources`
- `booking.offering_resources`
- `booking.offering_booking_configurations`
- `booking.recurring_working_hours`
- `booking.availability_exceptions`
- `booking.bookings`
- `booking.resource_reservations`
- `booking.booking_timeline`

It derives availability dynamically and does not pre-generate permanent future slot rows. Capacity greater than 1, public booking pages, provider calendar UI, booking inboxes, rescheduling UI, cancellation UI, notifications, and Rif booking actions remain future stages.

## Future WORKORDER-01

Future work-order work may add:

- `WorkOrder`
- `WorkOrderItem`
- `LaborItem`
- `PartItem`
- `CustomerApproval`
- `StatusHistory`
- `CompletionRecord`
- `Attachment`
- `InvoiceReference`

A service provider must not silently add chargeable work without customer approval.

## Future SERVICE-HISTORY-01

Future service history must distinguish provenance:

- `provider_verified`
- `integration_verified`
- `owner_reported`
- `document_extracted`
- `imported`
- `unverified`

Owner-reported and provider-verified records must not be presented with equal trust.

## Current Limitations

- No fake providers.
- No fake appointment slots.
- No fake prices.
- No ratings or reviews.
- No maps/geocoding.
- No CRM or external integrations.
- No service history.
- No booking or work-order writes.
