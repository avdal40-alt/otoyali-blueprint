# OTOYALI Design System

Status: UI-01 ready for FlutterFlow build
Scope: Sprint 1 MVP visual system and reusable UI rules
Client: FlutterFlow

OTOYALI is an AI-first transportation platform, but Sprint 1 must feel useful before AI exists. The UI should be calm, premium, fast to scan, and guest-first. Marketplace is one surface inside a broader transportation ecosystem, so the product language should feel like "mobility command center" rather than a classified ads wall.

## 1. Design Principles

| Principle | Rule |
|---|---|
| Guest-first | Home, Search, Listing Details, News, Article, and About never require login. |
| Premium utility | Use white space, strong typography, restrained color, and precise spacing. |
| Scan before sell | Cards prioritize image, price, make/model, year, mileage, city. |
| Auth on intent | Login appears only for Publish, Favorite, Contact Seller, Profile edit, and future AI features. |
| Small scalable system | Reuse the same card, chip, button, and state components everywhere. |
| FlutterFlow friendly | Prefer public views, component parameters, and simple responsive layouts. |

## 2. Color Tokens

Use a white base, black text, blue accent, cyan secondary accent, and orange only for publish/CTA moments.

| Token | Hex | FlutterFlow name | Usage |
|---|---:|---|---|
| `color.bg` | `#FFFFFF` | `OtoBg` | App background |
| `color.surface` | `#FFFFFF` | `OtoSurface` | Cards, sheets, nav |
| `color.surfaceAlt` | `#F6F8FB` | `OtoSurfaceAlt` | Search bars, soft sections |
| `color.text` | `#090B0F` | `OtoText` | Primary text |
| `color.textMuted` | `#5B6472` | `OtoTextMuted` | Secondary labels |
| `color.textSubtle` | `#8A93A3` | `OtoTextSubtle` | Metadata, helper text |
| `color.border` | `#E6EAF0` | `OtoBorder` | Dividers, input borders |
| `color.blue` | `#175CFF` | `OtoBlue` | Primary accent and selection |
| `color.blueDark` | `#0B3DBA` | `OtoBlueDark` | Pressed primary state |
| `color.cyan` | `#00C2D6` | `OtoCyan` | Secondary accent, status glow |
| `color.orange` | `#FF7A1A` | `OtoOrange` | Publish CTA only |
| `color.success` | `#12B76A` | `OtoSuccess` | Success state |
| `color.warning` | `#F79009` | `OtoWarning` | Warning state |
| `color.error` | `#E5484D` | `OtoError` | Error state |
| `color.overlay` | `#66090B0F` | `OtoOverlay` | Image scrim, modal overlay |

### Color Usage

- Home/Search cards: white surface, black title, blue action tint.
- Publish entry point: orange CTA only. Do not use orange for passive decoration.
- Filters and selected chips: blue border/background tint.
- News and About: mostly black/white, cyan accents for editorial tags.
- Avoid large gradients, dark blue pages, beige palettes, and decorative blobs.

## 3. Typography

Use one clean sans-serif family. Preferred: SF Pro if available on iOS; otherwise Inter. In FlutterFlow set App Font Family to `Inter` for consistency.

| Token | Size | Weight | Line height | Usage |
|---|---:|---:|---:|---|
| `type.hero` | 32 | 700 | 38 | Splash, Home headline only |
| `type.pageTitle` | 28 | 700 | 34 | Page headers |
| `type.sectionTitle` | 20 | 700 | 26 | Section titles |
| `type.cardTitle` | 16 | 700 | 22 | Vehicle/news card title |
| `type.body` | 15 | 400 | 22 | Paragraphs, descriptions |
| `type.bodyStrong` | 15 | 600 | 22 | Key metadata |
| `type.caption` | 13 | 500 | 18 | Labels, chips |
| `type.micro` | 11 | 600 | 14 | Tiny tags, timestamps |
| `type.price` | 20 | 800 | 24 | Card/detail price |

Rules:

- Letter spacing: `0`.
- Do not scale font size by viewport width.
- Use max 2 text weights in one component.
- Price should be bold but not oversized inside compact cards.

## 4. Spacing

Base unit: 4 px.

| Token | Value | Usage |
|---|---:|---|
| `space.1` | 4 | Dense inline gap |
| `space.2` | 8 | Chip/card inner gap |
| `space.3` | 12 | Field gap |
| `space.4` | 16 | Default screen padding |
| `space.5` | 20 | Section gap |
| `space.6` | 24 | Large section gap |
| `space.8` | 32 | Major layout gap |
| `space.10` | 40 | Page top rhythm |

Responsive margins:

| Breakpoint | Horizontal page padding | Content max width |
|---|---:|---:|
| Mobile | 16 | 100% |
| Tablet | 24 | 760 |
| Desktop web | 32 | 1180 |

## 5. Border Radius

Keep cards at 8 px or less unless the shape is an avatar or circular icon button.

| Token | Value | Usage |
|---|---:|---|
| `radius.xs` | 4 | Tags, small chips |
| `radius.sm` | 6 | Inputs, buttons |
| `radius.md` | 8 | Cards, sheets |
| `radius.full` | 999 | Avatars, round icon buttons |

## 6. Shadows

Use shadows sparingly. Premium automotive UI should feel crisp, not floating.

| Token | Value | Usage |
|---|---|---|
| `shadow.none` | none | Most surfaces |
| `shadow.card` | `0 6 18 #14090B0F` | Vehicle cards |
| `shadow.nav` | `0 -8 24 #10090B0F` | Bottom navigation |
| `shadow.sheet` | `0 -16 40 #18090B0F` | Modal bottom sheets |

## 7. Buttons

### PrimaryButton

- Height: 48 mobile, 44 desktop.
- Radius: 6.
- Background: `OtoBlue`.
- Text: white, 15/600.
- Icon: optional left, 18 px.
- Disabled: `#D5DBE5` background, `#8A93A3` text.

Use for: search confirm, OTP verify, profile save.

### SecondaryButton

- Height: 44.
- Radius: 6.
- Background: white.
- Border: `OtoBorder`.
- Text: `OtoText`.
- Pressed: `OtoSurfaceAlt`.

Use for: back, cancel, filters, reset.

### Publish CTA

- Same shape as PrimaryButton.
- Background: `OtoOrange`.
- Use only for `Sat`, `Ilan yayinla`, or publish intent.

## 8. Inputs

Default input:

- Height: 48.
- Radius: 6.
- Background: `OtoSurfaceAlt`.
- Border: transparent default, `OtoBlue` focused, `OtoError` error.
- Label: 13/600 `OtoTextMuted`.
- Text: 15/500 `OtoText`.
- Helper/error text: 13/500.

Search input:

- Height: 44.
- Radius: 8.
- Leading icon: search.
- Placeholder: `Marka, model veya sehir ara`.
- Optional trailing filter icon.

## 9. Cards

### Vehicle Cards

Vehicle cards are the most important repeatable UI. Keep them dense, image-led, and readable.

Card fields from `ff_home_listings`:

- `listing_id`
- `vehicle_profile_id`
- `title`
- `price_amount`
- `currency`
- `city`
- `published_at`
- `make_name`
- `model_name`
- `year`
- `mileage_km`
- `fuel_type`
- `transmission`
- `cover_image_url`

Rules:

- Image aspect ratio: horizontal card `4:3`, vertical card `16:10`.
- Show price in first visible text group.
- Show specs as compact chips: year, mileage, fuel, transmission.
- Use city and published date as metadata.
- Tap anywhere on card: open Listing Details with `listing_id`.

### Brand Cards

Use for makes from `ff_makes`.

- Size: 112 x 72 mobile, 128 x 80 tablet.
- Radius: 8.
- Background: white.
- Border: `OtoBorder`.
- Text: make name, centered, 15/700.
- Selected state: blue border, soft blue tint.

### News Cards

Sprint 1 has no news database yet. Use FlutterFlow local/static content until a news source is approved.

- Editorial card: title, excerpt, source/category, image optional.
- Image aspect ratio: `16:9`.
- Keep news separate from listings visually: less price-like hierarchy, more headline rhythm.

## 10. Bottom Navigation

Tabs:

1. Home
2. Search
3. Publish
4. News
5. Profile

Rules:

- Height: 64 mobile plus safe area.
- Background: white.
- Active icon/text: `OtoBlue`.
- Publish tab: orange plus icon, auth-gated.
- Profile tab: auth-gated only when guest taps it.
- Do not place a login wall before navigation.

## 11. States

### EmptyState

Use when a query returns no rows or a feature is intentionally not available yet.

- Icon: 32 px.
- Title: 18/700.
- Body: 14/400, max 2 lines.
- Optional action button.

Copy examples:

- Search empty: `Sonuc bulunamadi`
- Favorites: `Favoriler icin giris yap`
- Publish unavailable: `Yayinlama yakinda hazir olacak`

### LoadingSkeleton

- Use skeleton blocks instead of spinner-only screens.
- Card skeleton duration: 1000 to 1400 ms.
- Color base: `#EEF2F7`.
- Highlight: `#F8FAFC`.

### ErrorState

- Show user-friendly problem and retry button.
- Do not expose raw Supabase errors to users.
- Copy: `Bir sey ters gitti. Tekrar deneyin.`

## 12. Icon Guidance

Use FlutterFlow built-in Material Icons or Font Awesome consistently.

Recommended icons:

| Purpose | Icon |
|---|---|
| Search | `search` |
| Filter | `tune` |
| Home | `home_rounded` |
| Search tab | `travel_explore` |
| Publish | `add_circle_rounded` |
| News | `article_rounded` |
| Profile | `person_rounded` |
| Back | `arrow_back_ios_new_rounded` |
| Favorite | `favorite_border_rounded` |
| City | `location_on_outlined` |
| Mileage | `speed_rounded` |
| Fuel | `local_gas_station_rounded` |
| Electric | `bolt_rounded` |
| Transmission | `settings_suggest_rounded` |

## 13. Motion

- Page transition: fade or slide, 180-220 ms.
- Bottom sheet: standard FlutterFlow modal sheet.
- Card tap: subtle scale to 0.98 or opacity to 0.9.
- Avoid long hero animations until image loading is reliable.

## 14. Accessibility

- Minimum tap target: 44 x 44.
- Body contrast: black on white or muted gray on white only.
- Do not rely on color alone for selected filters.
- Add semantic labels for icon-only actions where FlutterFlow supports them.

## 15. MVP Do Not Build

- No AI surfaces yet.
- No VIN.
- No payments.
- No chat.
- No dealer dashboard.
- No login wall.
- No custom marketplace database changes from FlutterFlow.
