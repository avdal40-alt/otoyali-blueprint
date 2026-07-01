# OTOYALI MVP Page Blueprints

Status: UI-01 ready for FlutterFlow build
Scope: Sprint 1 maximum MVP screens

This document defines what each page displays, how it binds to the current public Supabase views, and where progressive authentication is required.

## Shared Routes

| Page | Route | Auth | Bottom Nav |
|---|---|---|---|
| Splash | `/splash` | No | No |
| Home | `/home` | No | Yes |
| Search | `/search` | No | Yes |
| Listing Details | `/listing/:listingId` | No | No |
| Publish Listing | `/publish` | Yes | Yes |
| Login | `/login` | No | No |
| OTP Verification | `/otp` | No | No |
| News | `/news` | No | Yes |
| Article | `/article/:articleId` | No | No |
| Profile | `/profile` | Progressive | Yes |
| Settings | `/settings` | Yes | No |
| Notifications | `/notifications` | Yes | No |
| About | `/about` | No | No |

## Shared App State

| Variable | Type | Purpose |
|---|---|---|
| `authReturnRoute` | String | Route to restore after OTP |
| `authReturnParams` | JSON/String | Route parameters to restore |
| `authPendingAction` | String | `none`, `sell`, `open_profile`, `favorite`, `contact` |
| `pendingPhone` | String | E.164 phone during OTP |
| `searchQuery` | String | Current search text |
| `selectedMakeId` | String/UUID | Search make filter |
| `selectedModelId` | String/UUID | Search model filter |
| `selectedCity` | String | Search city filter |
| `sortKey` | String | `newest`, `price_low`, `price_high`, `mileage_low` |

## Data Sources

| Source | Use |
|---|---|
| `ff_home_listings` | Home listing rows and Search result rows |
| `ff_listing_details` | Listing detail header and specs |
| `ff_listing_media` | Listing gallery |
| `ff_makes` | Home brand row and Search make filter |
| `ff_models` | Search model filter |
| `profiles` | Profile display/edit after auth |

News uses static FlutterFlow content for UI-01. Do not add a database table for news in this task.

## 1. Splash

Goal: quick brand entry, never a login gate.

Layout:

- White background.
- Center text logo `OTOYALI` using 28/800 black.
- Small blue loading indicator below.

On Page Load:

1. Optional session restore silently.
2. Wait 400-600 ms max.
3. Navigate Replace to `/home`.

Acceptance:

- Guest goes to Home.
- Authenticated user also goes to Home.
- Splash never routes directly to Login.

## 2. Home

Goal: daily-use discovery page for guest and authenticated users.

Data:

- Query `ff_home_listings`.
- Query `ff_makes`.

Layout:

1. `OtoyaliAppBar`
   - Logo left.
   - Guest: `Giris yap` right.
   - Auth: avatar/profile icon right.
2. Hero strip
   - Title: `Aracinizi bulun`
   - Subtitle: `Turkiye icin premium otomotiv deneyimi`
   - `OtoyaliSearchBar`.
3. Brand row
   - Horizontal list of `BrandCard` from `ff_makes`.
4. Featured listings
   - Vertical list of `VehicleHorizontalCard` from `ff_home_listings`.
   - Sort by `published_at` descending.
5. News teaser
   - 2 static `NewsCard` items.
6. `BottomNavBar`.

Bindings:

- `VehicleHorizontalCard.listingId` = `ff_home_listings.listing_id`.
- `VehicleHorizontalCard.coverImageUrl` = `ff_home_listings.cover_image_url`.
- `BrandCard.makeName` = `ff_makes.make_name`.

Actions:

- Search submit: navigate to `/search`, pass `searchQuery`.
- Brand tap: set `selectedMakeId`; navigate `/search`.
- Vehicle tap: navigate `/listing/:listingId`.
- Publish tab/FAB: `requireAuth(sell, /publish)`.

Loading:

- Show 1 search skeleton, 6 brand skeletons, 4 vehicle skeletons.

Empty:

- Show `EmptyState` with title `Aktif ilan bulunamadi`.

## 3. Search

Goal: browse/filter active listings without login.

Data:

- Query `ff_home_listings`.
- Query `ff_makes`.
- Query `ff_models`.

Layout:

1. `OtoyaliAppBar` with back optional false.
2. Sticky `OtoyaliSearchBar` with filter icon.
3. Filter row
   - Make chips/cards from `ff_makes`.
   - Model dropdown filtered by selected make using `ff_models`.
   - City segmented chips: Istanbul, Ankara, Izmir, Antalya.
   - Sort menu.
4. Results count label.
5. `VehicleVerticalCard` list/grid.
6. `BottomNavBar`.

Client filters:

- Text: title, make_name, model_name, city.
- Make: `make_id` is not currently in `ff_home_listings`, so for Sprint 1 filter by `make_name` from selected `ff_makes.make_name`.
- Model: filter by `model_name`.
- City: filter by `city`.
- Sort: page-level sort on loaded rows.

Risk:

- For large datasets, client-side filtering is temporary. Sprint 1 demo scale is acceptable. Add a server search view/RPC later only when needed.

Actions:

- Vehicle tap: navigate Listing Details.
- Favorite tap: auth-gated stub.

## 4. Listing Details

Goal: rich public listing detail with no owner private data.

Route parameter:

- `listingId`

Data:

- Query `ff_listing_details` where `listing_id = listingId`.
- Query `ff_listing_media` where `listing_id = listingId`, order by `is_cover desc`, `sort_order asc`.

Layout:

1. `VehicleDetailHero`
   - Media gallery.
   - Title.
   - Price.
2. Spec section
   - `VehicleSpecChip`: year, mileage, fuel, transmission.
3. Description section
   - `description`.
4. Location section
   - City only.
5. Sticky bottom action bar
   - Secondary: Favorite, auth-gated stub.
   - Primary blue: Contact Seller, auth-gated stub.

Do not show:

- Seller phone.
- Seller email.
- Seller profile details.
- Chat entry.

Missing row behavior:

- Show ErrorState or EmptyState: `Ilan bulunamadi`.

## 5. Publish Listing

Goal: auth-gated publish form blueprint for Sprint 1.

Auth:

- Required.
- Guest taps Publish: `requireAuth(sell, /publish)`.

Data available:

- `ff_makes` for make picker.
- `ff_models` for model picker.
- `profiles` to check minimal profile fields.

Important implementation boundary:

- The current FlutterFlow public views are read-only. Do not write through views.
- If FlutterFlow cannot import `vehicle` and `marketplace` schemas for writes, keep the final submit button disabled or route to a controlled write endpoint in a later task.
- Do not put ownership/business validation only in FlutterFlow.

Layout:

1. `OtoyaliAppBar` title `Ilan yayinla`.
2. Profile completion prompt if `profiles.first_name` or `profiles.city` is null.
3. Form sections:
   - Vehicle: make, model, year, mileage, fuel, transmission.
   - Listing: title, description, price, city.
   - Photos: uploader placeholder.
   - Review: summary card.
4. Bottom Publish CTA in orange.

Fields:

| Field | MVP required | Notes |
|---|---:|---|
| Make | Yes | From `ff_makes` |
| Model | Yes | From `ff_models` filtered by make |
| Year | Yes | 1900 to current year + 1 |
| Mileage | Yes | Numeric, km |
| Fuel | Yes | gasoline, diesel, lpg, electric, hybrid |
| Transmission | Yes | manual, automatic |
| Title | Yes | Generated from year/make/model or user typed |
| Price | Yes | TRY |
| City | Yes | Istanbul, Ankara, Izmir, Antalya for MVP |
| Description | No | Optional |
| Photos | Yes for production UX | Can be placeholder until storage flow is wired |

## 6. Login

Goal: phone auth entered only by user intent.

Layout:

- `OtoyaliAppBar` with back.
- Title: `Telefon numaranizla devam edin`.
- Phone input:
  - Prefix `+90`.
  - Numeric.
- PrimaryButton: `Kod gonder`.
- Legal/helper text.

Actions:

1. Validate phone.
2. Set `pendingPhone`.
3. Supabase Phone Auth send OTP.
4. Navigate to `/otp`.

Back:

- Return to previous route/context.

## 7. OTP Verification

Goal: verify code and return to saved context.

Layout:

- `OtoyaliAppBar` with back.
- Title: `Kodu girin`.
- 6-digit OTP input.
- PrimaryButton: `Dogrula`.
- Secondary resend action.

Actions:

1. Verify OTP with Supabase.
2. On success call `returnFromAuth()`.
3. If `authPendingAction == sell`, navigate `/publish`.
4. If `authPendingAction == open_profile`, navigate `/profile`.
5. Else navigate `authReturnRoute` or `/home`.

## 8. News

Goal: give guests a reason to return even when they are not buying today.

Data:

- Static FlutterFlow list for UI-01.
- Do not add news backend tables in this task.

Layout:

1. `OtoyaliAppBar`.
2. Page title: `Otomotiv haberleri`.
3. Category chips: Guncel, Elektrikli, Rehber, Piyasa.
4. List of `NewsCard`.
5. `BottomNavBar`.

Actions:

- NewsCard tap: navigate Article with `articleId`.

## 9. Article

Goal: readable article detail.

Data:

- Static/local article by `articleId`.

Layout:

- AppBar with back.
- Category label.
- Title.
- Published date/source.
- Hero image optional.
- Body text.
- Related listing CTA optional: `Piyasadaki ilanlara bak` -> Search.

No auth.

## 10. Profile

Goal: account surface without blocking browsing.

Auth:

- Progressive. Guest tapping Profile triggers auth.

Data:

- Query `profiles` where `id = currentUserUid`.

Layout:

1. `OtoyaliAppBar`.
2. Profile summary:
   - phone
   - first_name / last_name
   - city
3. Quick actions:
   - Publish listing.
   - Settings.
   - Notifications.
   - About.
4. Sign out button.
5. `BottomNavBar`.

Actions:

- Edit profile: update `profiles` only.
- Sign out: Supabase sign out, navigate `/home`.

## 11. Settings

Goal: simple MVP settings without new backend dependencies.

Auth:

- Required.

Data:

- `profiles` for editable language/city/name fields.
- Local FlutterFlow app state for visual-only toggles until server settings are exposed.

Layout:

- AppBar with back.
- Account section.
- Language display.
- City field.
- Privacy placeholders.
- Logout.

Rule:

- Do not add settings tables from UI-01.

## 12. Notifications

Goal: empty but polished shell for future retention features.

Auth:

- Required.

Data:

- None for UI-01.

Layout:

- AppBar with back.
- `EmptyState`
  - Title: `Bildirim yok`
  - Body: `Onemli ilan ve hesap bildirimleri burada gorunecek.`

Rule:

- Do not add notification tables from UI-01.

## 13. About

Goal: explain OTOYALI as an AI-first transportation platform without forcing auth.

Data:

- Static content.

Layout:

- AppBar with back.
- Text logo.
- Short platform statement.
- Sections:
  - Guest-first browsing.
  - Premium automotive experience.
  - Turkey-first foundation.
  - Future AI modules, clearly labeled as future.
- Secondary button: `Ana sayfaya don`.

No auth.

## Auth Trigger Matrix

| Action | Guest can start? | Auth required? | Current behavior |
|---|---:|---:|---|
| Browse Home | Yes | No | Direct |
| Search | Yes | No | Direct |
| Listing Details | Yes | No | Direct |
| News/Article | Yes | No | Direct |
| Publish | Yes | Yes | `requireAuth(sell, /publish)` |
| Favorite | Yes | Yes | Auth then stub |
| Contact Seller | Yes | Yes | Auth then stub |
| Profile | Yes | Yes | `requireAuth(open_profile, /profile)` |
| Edit Profile | No | Yes | Update `profiles` |

## MVP Page Acceptance Checklist

- No page routes guest to Login on app open.
- Home/Search/Details render from public views.
- Detail page does not expose private seller data.
- Publish is auth-gated.
- News is readable without auth.
- Profile edit touches only `profiles`.
- All future modules are labeled as future, not built.
