# Home Data Binding - ff_home_listings

Status: UI-02 ready for FlutterFlow implementation
Project: Otoyali Mobility
Preferred fix: use `OtoyaliVehicleCard` custom widget

## Why this exists

The current Home ListView uses `ff_home_listings Rows` and places a `CarCard` component inside each row.

The existing `CarCard.imgDesc` parameter expects `Image Path`, but `ff_home_listings.cover_image_url` is a String URL. That creates FlutterFlow binding errors and makes every card field too manual.

Use `OtoyaliVehicleCard` instead. It accepts primitive fields directly from `Current ff_home_listings Row`, including `imageUrl` as String.

## Add the Custom Widget

1. Open FlutterFlow project `Otoyali Mobility`.
2. Go to Custom Code > Custom Widgets.
3. Create a widget named `OtoyaliVehicleCard`.
4. Paste code from:
   - `apps/flutterflow/custom-widgets/otoyali_vehicle_card.dart`
5. Add these parameters in FlutterFlow:

| Parameter | FlutterFlow type | Required |
|---|---|---:|
| `listingId` | String | Yes |
| `imageUrl` | String | Yes |
| `title` | String | Yes |
| `priceAmount` | Double / Number | Yes |
| `currency` | String | Yes |
| `city` | String | Yes |
| `year` | Integer | Yes |
| `mileageKm` | Integer | Yes |
| `fuelType` | String | Yes |
| `transmission` | String | Yes |

Optional FlutterFlow custom widget parameters:

| Parameter | FlutterFlow type | Notes |
|---|---|---|
| `width` | Double | Set to infinity / parent width when placing |
| `height` | Double | Leave empty for natural card height |

If FlutterFlow imports `price_amount` as Integer, bind it directly if FlutterFlow allows numeric coercion. If it complains, add a small FlutterFlow transform to convert the value to Double.

## Home ListView Binding

ListView setup:

| FlutterFlow field | Value |
|---|---|
| Backend Query | Supabase Query |
| Table/View | `ff_home_listings` |
| Query variable | `ffHomeListingsRows` or FlutterFlow default |
| ListView value | `ff_home_listings Rows` |
| Sort | `published_at` descending |
| Empty state | `EmptyState` component |
| Loading state | `LoadingSkeleton` component |

Inside the repeated ListView item, add `OtoyaliVehicleCard`.

## Exact Binding Map

| OtoyaliVehicleCard input | FlutterFlow binding |
|---|---|
| `listingId` | Current `ff_home_listings` Row -> `listing_id` |
| `imageUrl` | Current `ff_home_listings` Row -> `cover_image_url` |
| `title` | Current `ff_home_listings` Row -> `title` |
| `priceAmount` | Current `ff_home_listings` Row -> `price_amount` |
| `currency` | Current `ff_home_listings` Row -> `currency` |
| `city` | Current `ff_home_listings` Row -> `city` |
| `year` | Current `ff_home_listings` Row -> `year` |
| `mileageKm` | Current `ff_home_listings` Row -> `mileage_km` |
| `fuelType` | Current `ff_home_listings` Row -> `fuel_type` |
| `transmission` | Current `ff_home_listings` Row -> `transmission` |

## Navigation Binding

The widget renders the card only. Add navigation at the ListView item level:

1. Wrap `OtoyaliVehicleCard` with a clickable Container or add an action to the custom widget wrapper.
2. On Tap:
   - Navigate to `ListingDetailsPage`.
   - Pass page parameter:
     - `listingId` = Current `ff_home_listings` Row -> `listing_id`

Do not use `tapAction String` for navigation. FlutterFlow navigation should be a page action, not a string parameter.

## Favorite Icon Behavior

The widget displays a favorite icon for visual consistency.

For Sprint 1:

- Do not wire favorites unless the favorite backend exists.
- If the user taps an external favorite action, call `requireAuth(favorite, current route)` and show a `Yakinda` snackbar.
- Do not add database tables for favorites in UI-02.

## Card Output

The card renders:

- Rounded remote image with loading and fallback states.
- Title.
- Formatted price, for example `1,250,000 TRY`.
- Specs line using bullet separators:
  - `2024 \u2022 12,000 km \u2022 Automatic \u2022 Petrol`
- City.
- Favorite icon.

## Troubleshooting

### Image binding error

Use `imageUrl` as String. Do not bind `cover_image_url` into an Image Path parameter.

### Price binding error

Use `priceAmount` as Double / Number. The widget formats the number internally, so do not pre-format `price_amount` in FlutterFlow.

### Specs are wrong language

Current display labels:

| Raw value | Display |
|---|---|
| `gasoline` | Petrol |
| `diesel` | Diesel |
| `lpg` | LPG |
| `electric` | Electric |
| `hybrid` | Hybrid |
| `manual` | Manual |
| `automatic` | Automatic |

### Card does not navigate

The custom widget intentionally has no internal navigation. Wrap it or attach an On Tap action in FlutterFlow and pass `listing_id`.

## Do Not Change

- Do not change Supabase schema.
- Do not change RLS.
- Do not edit `ff_home_listings`.
- Do not add favorites, chat, payments, dealer, VIN, or AI modules.
