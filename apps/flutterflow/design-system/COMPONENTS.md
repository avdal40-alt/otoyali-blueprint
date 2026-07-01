# FlutterFlow Component Specifications

Status: UI-01 ready for build
Scope: reusable MVP components for FlutterFlow

Use these names exactly in FlutterFlow Components. Keep all components parameter-driven so pages can bind Supabase view rows without duplicating card layouts.

## Component Index

| Component | Main Use | Data Source |
|---|---|---|
| `OtoyaliAppBar` | Top navigation and brand | App/session state |
| `OtoyaliSearchBar` | Search entry and filter action | Page state |
| `BrandCard` | Make filter card | `ff_makes` |
| `VehicleHorizontalCard` | Home compact listings | `ff_home_listings` |
| `VehicleVerticalCard` | Search grid/list cards | `ff_home_listings` |
| `OtoyaliVehicleCard` | Bindable Home/Search custom widget | `ff_home_listings` |
| `VehicleDetailHero` | Listing detail top area | `ff_listing_details`, `ff_listing_media` |
| `VehicleSpecChip` | Year/mileage/fuel/transmission | View fields |
| `NewsCard` | Static/manual news MVP | Local/static data |
| `BottomNavBar` | Main tab navigation | App state |
| `PrimaryButton` | Main action | Component params |
| `SecondaryButton` | Secondary action | Component params |
| `EmptyState` | No data / gated intent | Component params |
| `LoadingSkeleton` | Query loading | Component params |
| `ErrorState` | Query/action error | Component params |

## Global Component Rules

- Use token names from `DESIGN_SYSTEM.md`.
- Radius is 8 px max for cards and 6 px for buttons/inputs.
- Do not nest cards inside cards.
- All card components must expose a tap action parameter or documented page action.
- All text should have max lines set to prevent overflow.
- Use `OtoyaliImageWithFallback` custom widget for remote vehicle images where possible.
- Use `OtoyaliPriceText` custom widget for TRY formatting where possible.

## OtoyaliAppBar

Purpose: consistent app header across guest and authenticated pages.

Parameters:

| Name | Type | Required | Notes |
|---|---|---:|---|
| `title` | String | No | Defaults to `OTOYALI` |
| `showBack` | Boolean | Yes | Show back icon |
| `showLogo` | Boolean | Yes | Text logo if no asset exists |
| `showLogin` | Boolean | Yes | True for guest pages |
| `showAvatar` | Boolean | Yes | True when authenticated |
| `avatarUrl` | String | No | From `profiles.avatar_url` if available |
| `rightActionIcon` | Icon | No | Optional settings/filter icon |

Layout:

- Container height: 56 mobile, 64 tablet/web.
- Horizontal padding: 16 mobile, 24 tablet.
- Left: back icon or text logo `OTOYALI`.
- Center: optional title for detail/subpages.
- Right: `Giris yap` text button for guests, avatar/icon for auth users.
- Background: white.
- Bottom border: 1 px `OtoBorder` only on scroll-heavy pages.

Actions:

- Back icon: Navigate Back.
- Login: set `authReturnRoute = current route`; Navigate to `LoginPage`.
- Avatar: Navigate to `ProfilePage` if authenticated, else `requireAuth(open_profile, /profile)`.

## OtoyaliSearchBar

Purpose: reusable search field for Home and Search.

Parameters:

| Name | Type | Required | Notes |
|---|---|---:|---|
| `placeholder` | String | Yes | Default: `Marka, model veya sehir ara` |
| `value` | String | No | Bind to page state `searchQuery` |
| `showFilter` | Boolean | Yes | True on Search |
| `autoFocus` | Boolean | No | True on Search page |

Layout:

- Height: 44.
- Radius: 8.
- Background: `OtoSurfaceAlt`.
- Leading search icon.
- TextField with no visible label.
- Optional trailing filter icon button.

Actions:

- On Changed: update page state `searchQuery`.
- On Submit: update query/filter state; stay on page.
- Filter icon: open filter bottom sheet or reveal filters panel.

## BrandCard

Purpose: make filter and brand discovery.

Bind from `ff_makes`:

| Component field | View field |
|---|---|
| `makeId` | `make_id` |
| `makeName` | `make_name` |
| `makeSlug` | `make_slug` |

Parameters:

- `makeId` String/UUID
- `makeName` String
- `isSelected` Boolean

Layout:

- Width: 112 mobile, 128 tablet/web.
- Height: 72 mobile, 80 tablet/web.
- Radius: 8.
- Border: `OtoBorder`, selected `OtoBlue`.
- Text: centered, 15/700.

Action:

- On Tap: set `selectedMakeId`; navigate to Search or filter current Search list.

## VehicleHorizontalCard

Purpose: dense Home listing row.

Bind from `ff_home_listings`:

| Component field | View field |
|---|---|
| `listingId` | `listing_id` |
| `vehicleProfileId` | `vehicle_profile_id` |
| `title` | `title` |
| `priceAmount` | `price_amount` |
| `currency` | `currency` |
| `city` | `city` |
| `publishedAt` | `published_at` |
| `makeName` | `make_name` |
| `modelName` | `model_name` |
| `year` | `year` |
| `mileageKm` | `mileage_km` |
| `fuelType` | `fuel_type` |
| `transmission` | `transmission` |
| `coverImageUrl` | `cover_image_url` |

Layout:

- Container: white, radius 8, optional card shadow.
- Padding: 8.
- Height: 128 mobile, 140 tablet.
- Image: 112 x 112 mobile, radius 6, cover fit.
- Right column: title, price, spec chips, city.
- Favorite icon: top-right, auth-gated and disabled/stub until favorites exist.

Actions:

- Card tap: Navigate to `ListingDetailsPage`, pass `listingId`.
- Favorite tap: `requireAuth(favorite, current route)` then show `Yakinda`.

## VehicleVerticalCard

Purpose: Search grid/list card.

Data binding: same as `VehicleHorizontalCard`.

Layout:

- Width: fills parent.
- Image aspect ratio: 16:10.
- Padding: 10.
- Radius: 8.
- Title max lines: 2.
- Price below title.
- Specs row wraps to second line if needed.

Responsive:

- Mobile Search: 1 column list.
- Tablet: 2 columns.
- Desktop web: 3 columns max inside 1180 px content width.

Actions:

- Card tap: Navigate to `ListingDetailsPage`, pass `listingId`.

## OtoyaliVehicleCard

Purpose: FlutterFlow custom widget replacement for manually wired Home `CarCard`.

Use when FlutterFlow binding fails because a component image parameter expects `Image Path` while `ff_home_listings.cover_image_url` is a String URL.

Custom widget file:

- `apps/flutterflow/custom-widgets/otoyali_vehicle_card.dart`

Inputs:

| Input | Type | View field |
|---|---|---|
| `listingId` | String | `listing_id` |
| `imageUrl` | String | `cover_image_url` |
| `title` | String | `title` |
| `priceAmount` | Double / Number | `price_amount` |
| `currency` | String | `currency` |
| `city` | String | `city` |
| `year` | Integer | `year` |
| `mileageKm` | Integer | `mileage_km` |
| `fuelType` | String | `fuel_type` |
| `transmission` | String | `transmission` |

Layout:

- Large 16:10 rounded remote image with loading and fallback states.
- Title max 2 lines.
- Internal price formatting, example `1,250,000 TRY`.
- Specs line generated internally from year, mileage, transmission, fuel.
- City row.
- Visual favorite icon.

Action:

- Add navigation in FlutterFlow at the wrapper/ListView item level.
- On tap, navigate to `ListingDetailsPage` and pass `listingId`.

## VehicleDetailHero

Purpose: listing detail visual and key purchase information.

Inputs:

| Name | Source |
|---|---|
| `listingId` | Page parameter |
| `title` | `ff_listing_details.title` |
| `priceAmount` | `ff_listing_details.price_amount` |
| `currency` | `ff_listing_details.currency` |
| `city` | `ff_listing_details.city` |
| `publishedAt` | `ff_listing_details.published_at` |
| `mediaRows` | `ff_listing_media` filtered by `listing_id` |

Layout:

- Image carousel top, aspect ratio 16:10 mobile, 21:9 desktop.
- Back button overlays image top-left.
- Favorite/share icons top-right; favorite auth-gated/stub.
- Detail title and price below image on white surface.
- Do not show private seller profile fields.

Actions:

- Contact Seller: auth-gated, then show `Iletisim yakinda`.
- Share: native share if FlutterFlow action is available; otherwise copy route/link.

## VehicleSpecChip

Purpose: small metadata pill.

Parameters:

- `icon` Icon
- `label` String
- `tone` String enum: `neutral`, `blue`, `cyan`

Layout:

- Height: 28.
- Radius: 999.
- Padding: 8 horizontal.
- Background: `OtoSurfaceAlt`.
- Icon: 14.
- Text: 12/600.

Use cases:

- Year: `2022`
- Mileage: `36.000 km`
- Fuel: `hybrid`
- Transmission: `automatic`

## NewsCard

Purpose: editorial card for MVP News page.

Sprint 1 data source: FlutterFlow local/static data only. Do not create a news database for UI-01.

Parameters:

- `articleId` String
- `title` String
- `excerpt` String
- `category` String
- `imageUrl` String
- `publishedLabel` String

Layout:

- Horizontal variant for News list.
- Image 96 x 72 mobile or 160 x 100 tablet.
- Title max 2 lines.
- Excerpt max 2 lines.

Action:

- Tap: Navigate to `ArticlePage`, pass `articleId`.

## BottomNavBar

Purpose: consistent guest-first navigation.

Tabs:

| Tab | Route | Auth |
|---|---|---|
| Home | `/home` | No |
| Search | `/search` | No |
| Publish | `/publish` | Yes |
| News | `/news` | No |
| Profile | `/profile` | Progressive |

Layout:

- Height: 64 plus safe area.
- Background: white.
- Top border or `shadow.nav`.
- Active color: `OtoBlue`.
- Publish icon: `OtoOrange`.

Actions:

- Home/Search/News: Navigate directly.
- Publish: `requireAuth(sell, /publish)`.
- Profile: if guest, `requireAuth(open_profile, /profile)`; else navigate.

## PrimaryButton

Parameters:

- `label` String
- `icon` Icon optional
- `isLoading` Boolean
- `isDisabled` Boolean
- `tone` String: `blue` or `orange`

Layout:

- Height: 48.
- Radius: 6.
- Full width by default.
- Loading state: centered progress indicator, keep fixed height.

## SecondaryButton

Parameters:

- `label` String
- `icon` Icon optional
- `isDisabled` Boolean

Layout:

- Height: 44.
- Radius: 6.
- White background.
- 1 px border.

## EmptyState

Parameters:

- `icon` Icon
- `title` String
- `body` String
- `actionLabel` String optional

Layout:

- Centered column.
- Max width: 320.
- Icon size: 32.
- Gap: 12.

## LoadingSkeleton

Parameters:

- `variant` String: `vehicle_horizontal`, `vehicle_vertical`, `brand`, `text`, `page`
- `itemCount` Integer

Implementation:

- Prefer the `OtoyaliLoadingSkeleton` custom widget for animated blocks.
- Use fixed dimensions matching final content to avoid layout shift.

## ErrorState

Parameters:

- `title` String
- `body` String
- `retryLabel` String

Layout:

- Centered column, max width 340.
- Error icon in `OtoError`.
- Retry button uses SecondaryButton.

Action:

- Retry: refresh current query/action chain.

## Formatting Helpers

Recommended custom widgets:

- `OtoyaliPriceText`: formats `price_amount` and `currency`.
- `OtoyaliImageWithFallback`: consistent network image loading/error behavior.
- `OtoyaliLoadingSkeleton`: animated loading placeholders.

Keep business logic out of custom widgets. They should format and render only.
