# FlutterFlow Build Guide

Status: UI-01 implementation guide
Scope: exact build steps for OTOYALI MVP pages, components, and data bindings

This guide assumes Supabase is already connected in FlutterFlow and the public views are available:

- `ff_home_listings`
- `ff_listing_details`
- `ff_listing_media`
- `ff_makes`
- `ff_models`
- `profiles`

Do not change database schema for UI-01.

## 1. Project Theme Setup

1. Open FlutterFlow project `OTOYALI`.
2. Go to Theme Settings.
3. Set font family to `Inter`.
4. Add colors:
   - `OtoBg` `#FFFFFF`
   - `OtoSurface` `#FFFFFF`
   - `OtoSurfaceAlt` `#F6F8FB`
   - `OtoText` `#090B0F`
   - `OtoTextMuted` `#5B6472`
   - `OtoTextSubtle` `#8A93A3`
   - `OtoBorder` `#E6EAF0`
   - `OtoBlue` `#175CFF`
   - `OtoBlueDark` `#0B3DBA`
   - `OtoCyan` `#00C2D6`
   - `OtoOrange` `#FF7A1A`
   - `OtoSuccess` `#12B76A`
   - `OtoWarning` `#F79009`
   - `OtoError` `#E5484D`
5. Set app background to `OtoBg`.
6. Set default body text color to `OtoText`.
7. Create text styles:
   - Hero: 32, weight 700
   - PageTitle: 28, weight 700
   - SectionTitle: 20, weight 700
   - CardTitle: 16, weight 700
   - Body: 15, weight 400
   - Caption: 13, weight 500
   - Micro: 11, weight 600
   - Price: 20, weight 800

## 2. Supabase Setup in FlutterFlow

1. Go to Backend > Supabase.
2. Confirm project URL and anon key.
3. Import public schema tables/views.
4. Confirm these public objects are visible:
   - `ff_home_listings`
   - `ff_listing_details`
   - `ff_listing_media`
   - `ff_makes`
   - `ff_models`
   - `profiles`
5. Do not wire writes to `ff_*` views.
6. Use `profiles` only for profile display/edit.

## 3. App State Setup

Create FlutterFlow App State variables:

| Name | Type | Persisted | Initial |
|---|---|---:|---|
| `authReturnRoute` | String | No | `/home` |
| `authReturnParams` | JSON or String | No | `{}` |
| `authPendingAction` | String | No | `none` |
| `pendingPhone` | String | No | empty |
| `searchQuery` | String | No | empty |
| `selectedMakeId` | String | No | empty |
| `selectedMakeName` | String | No | empty |
| `selectedModelId` | String | No | empty |
| `selectedModelName` | String | No | empty |
| `selectedCity` | String | No | empty |
| `sortKey` | String | No | `newest` |

## 4. Reusable Component Build Order

Build components in this order:

1. `PrimaryButton`
2. `SecondaryButton`
3. `VehicleSpecChip`
4. `OtoyaliSearchBar`
5. `BrandCard`
6. `VehicleHorizontalCard`
7. `VehicleVerticalCard`
8. `VehicleDetailHero`
9. `NewsCard`
10. `EmptyState`
11. `LoadingSkeleton`
12. `ErrorState`
13. `OtoyaliAppBar`
14. `BottomNavBar`

This order lets complex components reuse simpler ones.

## 5. Custom Widgets

Optional but recommended:

1. Go to Custom Code > Custom Widgets.
2. Add `OtoyaliPriceText` from `apps/flutterflow/custom-widgets/otoyali_price_text.dart`.
3. Add `OtoyaliImageWithFallback` from `apps/flutterflow/custom-widgets/otoyali_image_with_fallback.dart`.
4. Add `OtoyaliLoadingSkeleton` from `apps/flutterflow/custom-widgets/otoyali_loading_skeleton.dart`.
5. Do not add external pubspec dependencies for these widgets.

## 6. Auth Helper Action Chains

Create these action chains in FlutterFlow using app state and Supabase auth.

### `requireAuth(pendingAction, returnRoute)`

1. Set `authReturnRoute = returnRoute`.
2. Set `authPendingAction = pendingAction`.
3. If user is logged in:
   - Call `returnFromAuth`.
4. If user is guest:
   - Navigate to `LoginPage`.

### `returnFromAuth`

1. If `authPendingAction == sell`, navigate to `PublishListingPage`.
2. Else if `authPendingAction == open_profile`, navigate to `ProfilePage`.
3. Else navigate to `authReturnRoute`, fallback `/home`.
4. Set `authPendingAction = none`.

## 7. Page Build Steps

### SplashPage

1. Create page `SplashPage`, route `/splash`.
2. Set background `OtoBg`.
3. Add centered Column.
4. Add Text `OTOYALI`, style 28/800, color `OtoText`.
5. Add small loading indicator color `OtoBlue`.
6. On Page Load:
   - Wait 400-600 ms.
   - Navigate Replace to `HomePage`.
7. Do not add auth condition.

### HomePage

1. Create page `HomePage`, route `/home`.
2. Set auth required: false.
3. Add `OtoyaliAppBar`.
4. Add hero Column with title, subtitle, and `OtoyaliSearchBar`.
5. Add Backend Query on `ff_makes`.
6. Create horizontal ListView.
7. Bind each item to `BrandCard`.
8. On BrandCard tap:
   - Set `selectedMakeName = item.make_name`.
   - Navigate to `SearchPage`.
9. Add Backend Query on `ff_home_listings`.
10. Sort by `published_at` descending.
11. Create ListView of `VehicleHorizontalCard`.
12. Bind all fields from `ff_home_listings`.
13. On card tap:
   - Navigate to `ListingDetailsPage`.
   - Pass `listingId = item.listing_id`.
14. Add 2 static `NewsCard` teasers.
15. Add `BottomNavBar`, active tab Home.
16. Loading state: show `LoadingSkeleton`.
17. Empty state: show `EmptyState`.

### SearchPage

1. Create page `SearchPage`, route `/search`.
2. Set auth required: false.
3. Add `OtoyaliAppBar`.
4. Add sticky `OtoyaliSearchBar`, bind to `searchQuery`.
5. Add Backend Query `ff_makes`.
6. Add make horizontal filter row with `BrandCard`.
7. On make tap:
   - Set `selectedMakeName`.
   - Clear `selectedModelName`.
8. Add Backend Query `ff_models`.
9. Add model dropdown filtered by `make_name == selectedMakeName` when selected.
10. Add city filter chips: Istanbul, Ankara, Izmir, Antalya.
11. Add sort dropdown:
   - newest
   - price_low
   - price_high
   - mileage_low
12. Add Backend Query `ff_home_listings`.
13. Apply FlutterFlow client filters:
   - `title` contains `searchQuery` OR `make_name` contains `searchQuery` OR `model_name` contains `searchQuery` OR `city` contains `searchQuery`.
   - `make_name == selectedMakeName` when selected.
   - `model_name == selectedModelName` when selected.
   - `city == selectedCity` when selected.
14. Render `VehicleVerticalCard`.
15. On card tap pass `listingId`.
16. Add `BottomNavBar`, active tab Search.

### ListingDetailsPage

1. Create page `ListingDetailsPage`, route `/listing/:listingId`.
2. Add required page parameter `listingId` String/UUID.
3. Set auth required: false.
4. Add Backend Query `ff_listing_details`.
5. Filter `listing_id == listingId`.
6. Add Backend Query `ff_listing_media`.
7. Filter `listing_id == listingId`.
8. Sort media by:
   - `is_cover` descending.
   - `sort_order` ascending.
9. Add `VehicleDetailHero`.
10. Bind detail fields and media rows.
11. Add spec chips for year, mileage, fuel, transmission.
12. Add description text.
13. Add city metadata.
14. Add sticky bottom bar:
   - Favorite SecondaryButton: `requireAuth(favorite, current listing route)` then show `Yakinda`.
   - Contact PrimaryButton: `requireAuth(contact, current listing route)` then show `Iletisim yakinda`.
15. Missing row: show `ErrorState` with `Ilan bulunamadi`.

### PublishListingPage

1. Create page `PublishListingPage`, route `/publish`.
2. Set auth required: true or protect access through `requireAuth`.
3. Add `OtoyaliAppBar`, title `Ilan yayinla`.
4. Query current `profiles` row.
5. If `first_name` or `city` is empty, show profile completion panel.
6. Add form fields:
   - make dropdown from `ff_makes`
   - model dropdown from `ff_models`
   - year input
   - mileage input
   - fuel dropdown
   - transmission segmented control
   - title input
   - description multiline input
   - price input
   - city dropdown
   - photo upload placeholder
7. Add orange PrimaryButton `Ilan yayinla`.
8. Until a safe write path is available, disable final submit and show helper:
   - `Yayinlama altyapisi sonraki adimda baglanacak.`
9. Do not write to public `ff_*` views.

### LoginPage

1. Create page `LoginPage`, route `/login`.
2. Set auth required: false.
3. Add `OtoyaliAppBar` with back.
4. Add phone input with prefix `+90`.
5. On `Kod gonder`:
   - Normalize to E.164.
   - Set `pendingPhone`.
   - Call Supabase send OTP.
   - Navigate to `OtpVerificationPage`.
6. Back returns to prior page.

### OtpVerificationPage

1. Create page `OtpVerificationPage`, route `/otp`.
2. Set auth required: false.
3. Add OTP input with 6 digits.
4. On `Dogrula`:
   - Verify Supabase OTP using `pendingPhone`.
   - On success call `returnFromAuth`.
5. Add resend action with cooldown.
6. Error state stays on page.

### NewsPage

1. Create page `NewsPage`, route `/news`.
2. Set auth required: false.
3. Add `OtoyaliAppBar`.
4. Add page title `Otomotiv haberleri`.
5. Add category chips.
6. Add FlutterFlow local/static data list:
   - `articleId`
   - `title`
   - `excerpt`
   - `category`
   - `imageUrl`
   - `publishedLabel`
7. Render `NewsCard`.
8. On card tap navigate to `ArticlePage` with `articleId`.
9. Add `BottomNavBar`, active tab News.

### ArticlePage

1. Create page `ArticlePage`, route `/article/:articleId`.
2. Add page parameter `articleId`.
3. Set auth required: false.
4. Use local/static article data by `articleId`.
5. Add app bar back.
6. Add category, title, date/source, optional image, body.
7. Add SecondaryButton `Ilanlara bak`, navigate Search.

### ProfilePage

1. Create page `ProfilePage`, route `/profile`.
2. Guest entry must use `requireAuth(open_profile, /profile)`.
3. Query `profiles` where `id == currentUserUid`.
4. Show phone, name, city.
5. Add actions:
   - Publish Listing -> `/publish`
   - Settings -> `/settings`
   - Notifications -> `/notifications`
   - About -> `/about`
6. Add sign out button:
   - Supabase sign out.
   - Navigate Replace to `/home`.
7. Add `BottomNavBar`, active tab Profile.

### SettingsPage

1. Create page `SettingsPage`, route `/settings`.
2. Require auth.
3. Query current `profiles` row.
4. Add editable fields:
   - first_name
   - last_name
   - city
   - language
5. Save button updates `profiles`.
6. Add local-only toggles for theme/notification placeholders if desired.
7. Do not add new settings database tables.

### NotificationsPage

1. Create page `NotificationsPage`, route `/notifications`.
2. Require auth.
3. Add app bar back.
4. Add `EmptyState`:
   - title `Bildirim yok`
   - body `Onemli ilan ve hesap bildirimleri burada gorunecek.`
5. Do not add notification backend.

### AboutPage

1. Create page `AboutPage`, route `/about`.
2. Set auth required: false.
3. Add app bar back.
4. Add text logo `OTOYALI`.
5. Add copy:
   - `AI-first transportation platform`
   - `Guest-first browsing`
   - `Turkey-first automotive foundation`
6. Add SecondaryButton back to Home.

## 8. QA Checklist

Guest browsing:

- Splash opens Home, not Login.
- Guest can open Home, Search, Listing Details, News, Article, About.
- Guest sees active listings from `ff_home_listings`.
- Guest sees listing detail from `ff_listing_details`.
- Guest sees media from `ff_listing_media`.

Progressive auth:

- Publish tab sends guest to Login and returns to Publish.
- Profile tab sends guest to Login and returns to Profile.
- Contact Seller on detail asks auth, then shows MVP stub.
- Favorite asks auth, then shows MVP stub.

Design:

- No card radius above 8 except avatars/round icon buttons.
- Orange appears only for publish CTA.
- Cards do not nest inside cards.
- Text does not overflow at mobile width 320.
- Loading and empty states are present for all queried pages.

Backend boundaries:

- No database schema changes.
- No writes to `ff_*` views.
- No AI, VIN, payments, chat, dealer features.
