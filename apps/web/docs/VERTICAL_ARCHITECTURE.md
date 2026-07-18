# Vertical Architecture

WEB-12 prepares OTOYALI for multiple marketplace verticals without implementing those marketplaces yet.

## Confirmed Current Structure

Current production marketplace data is passenger-car focused:

- `marketplace.listings` is a sale/publication layer for car listings.
- `marketplace.listings.vehicle_profile_id` is `NOT NULL` and references `vehicle.vehicle_profiles`.
- `vehicle.vehicle_profiles` stores car specs such as make, model, year, mileage, fuel, transmission, body type, and future media-processing fields.
- `vehicle.profile_ownership` connects the profile to the seller/owner.
- `vehicle.profile_media` stores listing photos and MEDIA-01 variants (`original_url`, `large_url`, `card_url`, `thumb_url`) while keeping legacy `url`.
- `vehicle.makes` and `vehicle.models` are the current car catalog.
- `marketplace.listing_videos` is shared with car listings today and is used by OTOYALI Video.
- `marketplace.listing_favorites` references `marketplace.listings`.
- `marketplace.saved_searches` stores user-owned query params.
- `marketplace.reports` supports listing/video/user reports.
- Admin moderation uses `public.admin_users`, `public.admin_audit_logs`, shared moderation states, and marketplace listing/video/report queues.
- Public browsing reads from `public.ff_home_listings`, `public.ff_listing_details`, `public.ff_listing_media`, and video views.

Because `marketplace.listings.vehicle_profile_id` is mandatory, non-car listings cannot be represented safely yet. WEB-12 therefore does not add fake non-car inventory or pretend that non-car publishing is active.

## Registry

The central registry lives in:

- `src/lib/marketplace/types.ts`
- `src/lib/marketplace/verticals.ts`
- `src/lib/marketplace/attributes.ts`
- `src/lib/marketplace/search.ts`
- `src/lib/marketplace/publish.ts`

Supported vertical IDs:

- `cars`
- `commercial`
- `marine`
- `parts`
- `services`
- `insurance`
- reserved future IDs: `motorcycles`, `machinery`, `mobility`

Current lifecycle states:

- `cars`: `active`
- `commercial`, `marine`, `parts`, `insurance`: `coming_soon`
- `services`: registry status remains `coming_soon` for listing/publishing capability, but SERVICE-01 adds a real provider-category foundation under `service_marketplace`.
- `motorcycles`, `machinery`, `mobility`: `disabled`

The registry is the source of truth for route paths, labels, descriptions, icons, status, SEO inclusion, home featuring, supported seller/media types, and capability defaults.

## Capabilities

Capabilities are typed in `MarketplaceCapability`:

- `canBrowse`
- `canSearch`
- `canPublish`
- `canFavorite`
- `canSaveSearch`
- `canContactSeller`
- `canUploadImages`
- `canUploadVideo`
- `supportsDigitalTwin`
- `supportsPrice`
- `supportsLocation`
- `supportsCondition`
- `supportsSellerProfile`
- `requiresModeration`
- `supportsSEO`
- `supportsAttributes`
- `supportsInventory`

Feature flags and capability checks are UX controls only. They are not authorization and must never replace Supabase RLS, owner checks, or admin checks.

## Route Strategy

Existing public Turkish routes are preserved:

- `/ticari-araclar`
- `/deniz-araclari`
- `/yedek-parca`
- `/servisler`
- `/sigorta`

English equivalents continue through WEB-11 middleware:

- `/en/commercial-vehicles`
- `/en/marine-vehicles`
- `/en/spare-parts`
- `/en/services`
- `/en/insurance`

Future route shape is reserved in the registry but not created:

- `/marketplace/[vertical]`
- `/marketplace/[vertical]/search`
- `/marketplace/[vertical]/listing/[id]`
- `/marketplace/[vertical]/sell`

Do not create empty route trees until a vertical has real data and workflows.

## Shared Listing Shell

Shared cross-vertical listing contracts live in `src/lib/marketplace/types.ts`.

The shared listing summary intentionally includes only universal fields:

- ID
- vertical
- title
- price
- location
- primary media
- seller summary
- status
- moderation status
- timestamps
- optional vertical attributes

Car-specific fields such as make, model, year, mileage, fuel, and transmission stay in car-specific types/components. They must not become required for spare parts, services, insurance, or marine listings.

Services are not vehicle listings. Provider, branch, category, offering, and application persistence lives in `service_marketplace`; see [SERVICE_MARKETPLACE_ARCHITECTURE.md](./SERVICE_MARKETPLACE_ARCHITECTURE.md).

Prepared shared UI shells live in:

- `src/components/marketplace/MarketplaceListingShell.tsx`

Current car cards/details remain stable and are not forcibly rewritten.

## Attribute Model

Typed attribute definitions live in `src/lib/marketplace/attributes.ts`.

These definitions prepare field models for future vertical stages without adding database columns:

- Commercial: subtype, payload capacity, axle count, gross weight, cabin type.
- Marine: vessel type, length, engine type, hull material, year.
- Parts: category, condition, brand, OEM/aftermarket, compatible vehicles, part number.
- Services: service category, city, mobile service, appointment support.
- Insurance: insurance type, coverage scope, city.

This is not a JSON dumping ground. Future persistence should validate attributes through vertical-owned schemas or validated structures.

## Database Strategy

Recommended future model:

- Keep `marketplace.listings` as the shared commercial/publication layer.
- Add a minimal vertical discriminator only when non-car persistence is implemented.
- Keep seller, status, moderation, title, description, price, location, and timestamps in the shared listing layer.
- Store domain-specific entities in vertical-owned schemas:
  - `vehicle.vehicle_profiles`
  - `commercial.commercial_profiles`
  - `marine.vessel_profiles`
  - `parts.part_items`
  - `service_marketplace.providers`, `branches`, `categories`, `offerings`, `provider_applications`
  - insurance offer/request tables when insurance is actually built
- Link a listing to exactly one valid domain entity with real integrity.

Do not add polymorphic foreign keys without integrity. Do not make a universal table containing every possible field. Do not create empty schemas/tables just for appearance.

WEB-12 creates no migration because adding only `marketplace.listings.vertical` would not make non-car listings possible while `vehicle_profile_id` remains mandatory.

## Search Strategy

Existing `/search` remains car search.

Prepared future search request:

- vertical
- filters
- sort
- pagination

Each vertical owns its filter parser and supported sort options. Coming-soon verticals do not produce search results or fake inventory.

## Publish Strategy

Existing `/sell` remains car publishing.

Prepared behavior:

- `/sell` defaults to cars.
- `/sell?vertical=cars` uses the existing car flow.
- `/sell?vertical=<coming-soon>` shows a truthful unavailable state with links back to car publishing or the vertical landing page.

Future vertical publish flows should check registry capabilities before opening forms.

## Admin And Moderation

Admin moderation remains shared.

Today all listing rows are cars because the DB listing layer requires `vehicle_profile_id`. The admin listing table shows the car vertical badge to prepare UI vocabulary for future vertical filtering.

Future moderation should remain one admin surface with vertical-aware filters and vertical-specific checklist config:

- Cars: vehicle data, photos, seller information.
- Parts: compatibility and prohibited item checks.
- Services: service category and provider details.
- Insurance: legal copy and offer-disclosure checks.

Do not duplicate admin panels per vertical.

## Favorites And Saved Searches

Current favorites reference `marketplace.listings`.

Future-safe identity should include:

- vertical
- listing/entity ID

Do not expand favorites or saved searches until non-car listings exist. Plan this as a future FAVORITES/SEARCH task.

## SEO

Each registry item can define:

- localized title and description keys
- Turkish and English public routes
- sitemap inclusion
- indexability
- related verticals

Coming-soon pages are indexable only when they contain substantial, truthful content. Empty future search/detail/sell routes are not created or indexed.

Existing car SEO pages are preserved.

## How To Add A Future Vertical

1. Add or activate the vertical in `src/lib/marketplace/verticals.ts`.
2. Add typed attributes in `src/lib/marketplace/attributes.ts`.
3. Add Turkish and English dictionary keys under `verticals`.
4. Add real DB persistence with integrity if the vertical stores listings.
5. Add public read views or APIs with explicit columns.
6. Add search parser/filter support for that vertical.
7. Add publish flow only after the data model is ready.
8. Add admin checklist/filter support.
9. Update sitemap only for real public routes.
10. Run lint, typecheck, build, and smoke tests.

## Intentionally Not Implemented

WEB-12 does not implement:

- commercial vehicle publishing
- marine publishing
- parts marketplace
- BOOKING-01 service booking
- WORKORDER-01 service work orders
- insurance quotes
- payments
- shipping
- maps
- SMS
- email
- analytics provider
- AI provider
- TRAMER/SBM integrations
- external catalogs
- compatibility engine
- dealer subscriptions
- non-car database schemas
