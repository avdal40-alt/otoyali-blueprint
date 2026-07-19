# Booking Architecture

BOOKING-01A adds the reusable booking database and server-domain foundation for OTOYALI service providers. It does not expose booking UI, provider calendar UI, notifications, payments, work orders, CRM, fake availability, fake bookings, or AI booking actions.

## Base

- Base commit: `666cc00`
- Base task: `SERVICE-01 - Add service marketplace foundation`
- SERVICE-01 was pushed to `origin/main` and remote migration version `20260718120000` was synchronized before this stage.

## Canonical SERVICE-01 Entities Reused

- Provider: `service_marketplace.providers`
- Branch: `service_marketplace.branches`
- Offering: `service_marketplace.offerings`
- Provider owner: `service_marketplace.providers.owner_id -> public.profiles(id)`
- Provider member: not present in SERVICE-01; BOOKING-01A does not invent provider members.
- Admin: `public.admin_users`, checked through `public.is_admin(auth.uid())`

Public service discovery remains provider `active`, branch `active`, and offering `active`. Branches now have an additive `timezone` column because booking availability must interpret local working hours against a canonical IANA timezone.

## Migration

Migration: `supabase/migrations/20260719120000_booking01a_universal_booking_foundation.sql`

Config: `supabase/config.toml` keeps both `service_marketplace` and `booking` out of PostgREST `api.schemas`. Public Data API clients use narrow `public` views and facades instead of exposing private schemas.

Schema: `booking`

Tables:

- `booking.bookable_resources`
- `booking.offering_resources`
- `booking.offering_booking_configurations`
- `booking.recurring_working_hours`
- `booking.availability_exceptions`
- `booking.bookings`
- `booking.resource_reservations`
- `booking.booking_timeline`

The migration also enables `btree_gist` for the capacity-1 reservation exclusion constraint.

## Resource Model

A bookable resource belongs to a canonical SERVICE-01 provider and branch. Resource names and metadata are private provider/admin data. `resource_type` is an extensible constrained text field rather than a registry table because BOOKING-01A needs a small scalable foundation and resource wording will evolve across maintenance, tire fitting, detailing, charging, inspection, test-drive, towing, and future service verticals.

`capacity` is stored for future expansion, but BOOKING-01A guarantees conflict prevention only for capacity-1 resources.

## Offering Eligibility

`booking.offering_resources` links a SERVICE-01 offering to an eligible resource. A trigger verifies that the offering and resource belong to the same provider branch. A partial unique index prevents duplicate active links for the same offering/resource pair.

## Booking Configuration

`booking.offering_booking_configurations` stores:

- booking enabled flag
- booking mode
- duration
- preparation buffer
- cleanup buffer
- slot interval
- minimum notice
- maximum advance horizon
- cancellation/reschedule cutoffs
- vehicle requirement

No pricing, payments, notifications, or UI state live here.

Customer-visible interval:

- `requested_start_at`
- `requested_end_at`

Resource-blocking interval:

- `requested_start_at - preparation_minutes`
- `requested_end_at + cleanup_minutes`

## Working Hours

`booking.recurring_working_hours` stores same-day weekly local wall-clock rules:

- `day_of_week`: ISO day, `1 = Monday` through `7 = Sunday`
- `local_start_time`
- `local_end_time`
- optional effective date range

Multiple shifts per day are supported. Overlapping active shifts for the same resource/day/effective range are rejected by trigger. Overnight shifts are intentionally rejected in BOOKING-01A; future stages may represent them as two adjacent day rules.

## Timezone Strategy

Actual booking and reservation timestamps are `timestamptz`.

Recurring working hours are local wall-clock times interpreted using `service_marketplace.branches.timezone`. The branch timezone is validated against `pg_timezone_names`. The booking row stores a timezone snapshot so historical records remain interpretable if a branch timezone changes later.

Daylight-saving behavior depends on PostgreSQL timezone rules. BOOKING-01A documents this strategy and keeps the query range bounded; wider DST regression tests belong in BOOKING-01C.

## Availability Exceptions

Exception types:

- `unavailable`
- `available_override`
- `capacity_override`

Precedence:

1. inactive or archived resource -> no availability
2. unavailable exception -> blocks availability
3. available override -> opens time outside normal working hours
4. capacity override -> changes effective capacity
5. existing active reservation -> consumes capacity

For BOOKING-01A, effective capacity must still be `1` to appear in availability because transaction-safe capacity greater than 1 is deferred.

## Dynamic Availability

Internal function: `booking.get_public_availability(offering_id, range_start, range_end, slot_limit)`

Public Data API facade: `public.get_booking_availability(offering_id, range_start, range_end, slot_limit)`

The function:

- accepts a canonical SERVICE-01 offering
- requires a bounded range of at most 31 days
- resolves provider, branch, offering, config, and branch timezone
- returns nothing unless provider/branch/offering are active and booking is enabled
- finds active eligible capacity-1 resources
- applies recurring working hours and effective dates
- adds available overrides
- applies preparation and cleanup buffers
- enforces minimum notice and maximum advance horizon
- removes unavailable overlaps
- removes active reservation overlaps
- returns only safe slot data and aggregate capacity

It does not expose raw resource IDs, staff identity, exception reasons, bookings, reservations, or customer data.

## Reservations

`booking.resource_reservations` stores half-open blocking intervals: `[blocking_start_at, blocking_end_at)`.

An exclusion constraint prevents two active capacity-1 reservations for the same resource from overlapping. Adjacent intervals are allowed. Released reservations remain auditable but no longer block availability.

Capacity greater than 1 is explicitly deferred. The schema stores capacity fields, but reservation inserts require `capacity_units = 1` and resource capacity `1`.

## Booking Model

`booking.bookings` stores the current booking status for efficient reads and private operational data:

- non-sequential `public_reference`
- provider, branch, offering
- optional customer user
- optional customer contact snapshot
- optional vehicle link to `vehicle.vehicle_profiles`
- booking mode
- requested and confirmed intervals
- timezone snapshot
- actor data
- separate customer/provider notes
- lifecycle timestamps
- scoped idempotency key

Contact details, notes, cancellation reasons, and internal fields are not public.

## Idempotency

`booking.create_booking` scopes idempotency to:

- `created_by_type`
- `created_by_user_id`
- `idempotency_key`

The function locks on authenticated actor + key before checking existing rows. A reused key by the same actor returns the existing booking result. Another actor cannot retrieve someone else's booking through the same key.

Retention is not automated in BOOKING-01A; future cleanup policy can archive old idempotency keys after operational review.

## Lifecycle

Statuses:

- `requested`
- `pending_confirmation`
- `confirmed`
- `checked_in`
- `in_progress`
- `completed`
- `cancelled`
- `rejected`
- `no_show`

Allowed transitions:

- `requested -> pending_confirmation`
- `requested -> confirmed`
- `requested -> rejected`
- `requested -> cancelled`
- `pending_confirmation -> confirmed`
- `pending_confirmation -> rejected`
- `pending_confirmation -> cancelled`
- `confirmed -> checked_in`
- `confirmed -> cancelled`
- `confirmed -> no_show`
- `checked_in -> in_progress`
- `in_progress -> completed`

Terminal states do not reopen in BOOKING-01A.

Direct status updates are blocked by trigger. Status changes must use `booking.transition_booking_status`.

## Timeline

`booking.booking_timeline` is append-only.

Booking creation appends one `booking_created` event through a trigger. Every status transition appends one `status_changed` event through the transition function. Update/delete on timeline rows is blocked for normal clients, admins, and service role.

Timeline metadata must be a JSON object and must not contain secrets, personal contact data, or duplicated customer notes.

## Atomic Primitives

`booking.create_booking`:

- requires authenticated actor
- derives actor identity from `auth.uid()`
- validates active SERVICE-01 scope
- validates booking mode and config
- enforces vehicle requirement if configured
- enforces minimum notice and maximum advance
- finds an eligible capacity-1 resource
- inserts booking and reservation in one transaction
- relies on the exclusion constraint for final double-booking prevention
- appends initial timeline through trigger

`booking.transition_booking_status`:

- derives actor from current user
- allows provider owner/admin transitions through the matrix
- allows customers only to cancel their own booking in BOOKING-01A
- appends a timeline event
- releases active reservations for `cancelled`, `rejected`, and `no_show`

## RLS And Authorization

Guest/public:

- can execute safe public availability RPC
- cannot read raw resources, schedules, exceptions, bookings, reservations, or timeline
- cannot write booking tables

Authenticated customer:

- can later read own booking rows
- cannot manage resources, schedules, exceptions, reservations, timeline, or arbitrary statuses

Provider owner:

- can manage booking resources/configuration/schedules/exceptions only for owned providers
- can read provider bookings, reservations, and timeline
- cannot access another provider

Provider member:

- not implemented because SERVICE-01 has no provider-member table

Admin:

- uses `public.is_admin(auth.uid())`
- can manage provider-scoped booking data through RLS
- cannot silently rewrite timeline

Service role:

- reserved for trusted server operations
- not used in browser code

## Public And Private Boundaries

Public availability returns only:

- offering ID
- branch ID
- slot start/end
- timezone
- booking mode
- aggregate available resource count

It never exposes:

- customer contact data
- booking IDs
- raw resource names
- resource metadata
- exception reasons
- provider notes
- cancellation reasons
- inactive/unpublished provider data

## Rif Boundary

BOOKING-01A does not add AI tools or mutable AI actions.

Future Rif action pattern:

understand -> propose -> preview -> explicit user confirmation -> execute -> receipt

Rif must not create, confirm, cancel, or reschedule bookings until BOOKING-01C explicitly adds guarded tools.

## Verification

Local verification should include:

- migration static review
- SQL verification script review
- `npm.cmd run lint`
- `npm.cmd run typecheck -- --incremental false`
- `npm.cmd run build`
- smoke checks for existing public/service/admin routes
- confirmation no server remains on ports `3000` or `3001`

Remote migration application is deferred. A later manual stage may run:

```powershell
npx.cmd supabase db push
```

Do not apply this migration remotely from BOOKING-01A.

## Deferred BOOKING-01B

- public customer booking flow
- provider confirmation flow
- customer booking workspace
- provider booking inbox
- rescheduling UI
- cancellation UI
- provider resource management UI
- working-hour management UI

## Deferred BOOKING-01C

- alternative time proposals
- Rif read tools
- Rif booking preview
- explicit-confirmation action flow
- idempotency hardening
- wider concurrency testing
- expanded integration tests

## Other Explicit Exclusions

- work orders
- diagnosis
- service history
- notifications
- email, SMS, WhatsApp, push
- payments, deposits, refunds, invoices
- reviews and ratings
- external calendar synchronization
