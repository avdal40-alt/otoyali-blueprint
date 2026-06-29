# OTOYALI — FlutterFlow Structure

**Version:** 1.0.0  
**Classification:** Internal — Engineering  
**Last Updated:** 2026-06-29  
**Owner:** Frontend Architecture Team

---

## Table of Contents

1. [Overview](#1-overview)
2. [Project Configuration](#2-project-configuration)
3. [App Architecture](#3-app-architecture)
4. [Navigation Structure](#4-navigation-structure)
5. [Page Catalog](#5-page-catalog)
6. [Component Library](#6-component-library)
7. [State Management](#7-state-management)
8. [Custom Code Integration](#8-custom-code-integration)
9. [Supabase Integration](#9-supabase-integration)
10. [Internationalization (i18n)](#10-internationalization-i18n)
11. [Responsive Design](#11-responsive-design)
12. [Theme & Design System](#12-theme--design-system)
13. [Asset Management](#13-asset-management)
14. [Custom Actions & Functions](#14-custom-actions--functions)
15. [Platform-Specific Configuration](#15-platform-specific-configuration)
16. [Export & Deployment Pipeline](#16-export--deployment-pipeline)
17. [FlutterFlow Limitations & Workarounds](#17-flutterflow-limitations--workarounds)

---

## 1. Overview

OTOYALI uses **FlutterFlow** as the primary UI builder for iOS, Android, and responsive web from a single project. FlutterFlow generates Flutter code that is exported, extended with custom Dart code for AI/complex features, and deployed via CI/CD.

### Why FlutterFlow

| Benefit | Impact |
|---------|--------|
| Rapid prototyping | MVP in weeks, not months |
| Cross-platform | iOS + Android + Web from one project |
| Supabase native integration | Auth, DB, Storage, Edge Functions |
| Responsive design | Built-in breakpoint system |
| Custom code support | Escape hatch for complex features |
| Team scalability | Designers + developers collaborate |

### Project Identity

| Property | Value |
|----------|-------|
| Project Name | OTOYALI |
| Bundle ID (iOS) | `com.otoyali.app` |
| Package Name (Android) | `com.otoyali.app` |
| Web Domain | `otoyali.com` |
| Min iOS | 14.0 |
| Min Android SDK | 24 (Android 7.0) |
| Flutter Version | 3.x (latest stable) |

---

## 2. Project Configuration

### 2.1 FlutterFlow Project Settings

```
Project Settings
├── General
│   ├── Project Name: OTOYALI
│   ├── Description: AI-first automotive marketplace
│   └── Primary Color: #1A56DB (OTOYALI Blue)
├── Platforms
│   ├── iOS: ✅ Enabled
│   ├── Android: ✅ Enabled
│   └── Web: ✅ Enabled
├── Authentication
│   ├── Provider: Supabase
│   ├── Auth Type: Phone (OTP)
│   └── Auto-login: ✅ Enabled
├── Backend
│   ├── Provider: Supabase
│   ├── Project URL: https://{project-ref}.supabase.co
│   └── Anon Key: (from Supabase dashboard)
├── Localization
│   ├── Primary: Turkish (tr)
│   └── Secondary: English (en)
└── Deployment
    ├── iOS: App Store Connect
    ├── Android: Google Play Console
    └── Web: Firebase Hosting / Cloudflare Pages
```

### 2.2 Environment Variables (FlutterFlow)

| Variable | Dev | Staging | Production |
|----------|-----|---------|------------|
| `SUPABASE_URL` | dev project URL | staging URL | prod URL |
| `SUPABASE_ANON_KEY` | dev anon key | staging key | prod key |
| `API_BASE_URL` | dev API | staging API | api.otoyali.com |
| `CDN_URL` | dev CDN | staging CDN | cdn.otoyali.com |
| `GOOGLE_MAPS_KEY` | dev key | staging key | prod key |
| `SENTRY_DSN` | — | staging DSN | prod DSN |
| `ENVIRONMENT` | development | staging | production |

---

## 3. App Architecture

### 3.1 Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                     │
│  Pages → Components → Widgets (FlutterFlow built)         │
├─────────────────────────────────────────────────────────┤
│                    STATE LAYER                          │
│  App State (FFAppState) │ Page State │ Provider/Riverpod  │
├─────────────────────────────────────────────────────────┤
│                    SERVICE LAYER                        │
│  Custom Actions │ Supabase Queries │ Edge Function Calls│
├─────────────────────────────────────────────────────────┤
│                    DATA LAYER                           │
│  Supabase SDK │ Local Cache (Hive) │ Secure Storage      │
├─────────────────────────────────────────────────────────┤
│                    PLATFORM LAYER                       │
│  Camera │ GPS │ Push (FCM) │ Biometrics │ Deep Links    │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Folder Structure (Post-Export)

```
otoyali_app/
├── lib/
│   ├── main.dart                          # Entry point
│   ├── app_state.dart                     # Global app state (FF generated)
│   ├── index.dart                         # Route exports
│   │
│   ├── pages/                             # FlutterFlow pages
│   │   ├── auth/
│   │   │   ├── login_page/
│   │   │   ├── otp_verify_page/
│   │   │   └── profile_setup_page/
│   │   ├── home/
│   │   │   ├── home_page/
│   │   │   └── search_page/
│   │   ├── listings/
│   │   │   ├── listing_detail_page/
│   │   │   ├── listing_create_page/
│   │   │   ├── listing_edit_page/
│   │   │   └── my_listings_page/
│   │   ├── search/
│   │   │   ├── search_results_page/
│   │   │   └── search_filters_page/
│   │   ├── ai/
│   │   │   ├── ai_assistant_page/
│   │   │   └── ai_valuation_page/
│   │   ├── messaging/
│   │   │   ├── conversations_page/
│   │   │   └── chat_page/
│   │   ├── profile/
│   │   │   ├── profile_page/
│   │   │   ├── settings_page/
│   │   │   └── favorites_page/
│   │   ├── dealer/
│   │   │   ├── dealer_dashboard_page/
│   │   │   └── dealer_register_page/
│   │   ├── commerce/
│   │   │   ├── paid_listing_page/
│   │   │   └── payment_page/
│   │   ├── financial/
│   │   │   ├── financing_page/
│   │   │   └── insurance_page/
│   │   ├── vin/
│   │   │   ├── vin_scanner_page/
│   │   │   └── vin_report_page/
│   │   ├── news/
│   │   │   ├── news_list_page/
│   │   │   └── article_detail_page/
│   │   └── parts/
│   │       ├── parts_search_page/
│   │       └── part_detail_page/
│   │
│   ├── components/                        # Reusable components
│   │   ├── listing/
│   │   │   ├── listing_card/
│   │   │   ├── listing_card_horizontal/
│   │   │   ├── listing_card_featured/
│   │   │   ├── listing_image_gallery/
│   │   │   ├── listing_specs_table/
│   │   │   ├── listing_price_widget/
│   │   │   └── listing_seller_info/
│   │   ├── search/
│   │   │   ├── search_bar/
│   │   │   ├── search_filters_panel/
│   │   │   ├── filter_chip/
│   │   │   └── sort_dropdown/
│   │   ├── ai/
│   │   │   ├── ai_chat_bubble/
│   │   │   ├── ai_chat_input/
│   │   │   ├── ai_listing_card_embed/
│   │   │   └── valuation_widget/
│   │   ├── common/
│   │   │   ├── app_bar_main/
│   │   │   ├── bottom_nav_bar/
│   │   │   ├── loading_shimmer/
│   │   │   ├── empty_state/
│   │   │   ├── error_state/
│   │   │   ├── price_display/
│   │   │   ├── location_display/
│   │   │   └── trust_badge/
│   │   ├── forms/
│   │   │   ├── phone_input/
│   │   │   ├── otp_input/
│   │   │   ├── make_model_picker/
│   │   │   ├── year_picker/
│   │   │   ├── price_input/
│   │   │   └── image_uploader/
│   │   └── messaging/
│   │       ├── conversation_tile/
│   │       ├── message_bubble/
│   │       └── message_input/
│   │
│   ├── custom_code/                       # Custom Dart (NOT in FlutterFlow)
│   │   ├── actions/
│   │   │   ├── ai_assistant_stream.dart
│   │   │   ├── vin_scanner.dart
│   │   │   ├── image_compress.dart
│   │   │   ├── location_service.dart
│   │   │   ├── push_notification_handler.dart
│   │   │   └── deep_link_handler.dart
│   │   ├── widgets/
│   │   │   ├── ai_chat_widget.dart        # Full AI chat (streaming)
│   │   │   ├── vin_camera_scanner.dart    # ML Kit VIN OCR
│   │   │   ├── map_picker_widget.dart     # Google Maps location
│   │   │   ├── image_carousel_zoom.dart   # Pinch-to-zoom gallery
│   │   │   └── financing_calculator.dart  # Interactive EMI calculator
│   │   ├── models/
│   │   │   ├── listing_model.dart
│   │   │   ├── valuation_model.dart
│   │   │   └── ai_message_model.dart
│   │   └── services/
│   │       ├── api_service.dart
│   │       ├── analytics_service.dart
│   │       └── cache_service.dart
│   │
│   ├── flutter_flow/                      # FF generated utilities
│   │   ├── flutter_flow_theme.dart
│   │   ├── flutter_flow_util.dart
│   │   ├── flutter_flow_widgets.dart
│   │   └── internationalization.dart
│   │
│   └── backend/                           # Supabase integration (FF generated)
│       ├── supabase/
│       │   ├── supabase.dart
│       │   ├── database/
│       │   │   ├── tables/
│       │   │   └── queries/
│       │   └── storage/
│       └── schema/
│           └── structs/
│
├── assets/
│   ├── images/
│   │   ├── logo/
│   │   ├── icons/
│   │   ├── illustrations/
│   │   └── placeholders/
│   ├── fonts/
│   │   └── Inter/                         # Primary font family
│   └── json/
│       └── turkish_cities.json
│
├── test/
│   ├── widget_test/
│   └── integration_test/
│
├── ios/
├── android/
├── web/
├── pubspec.yaml
└── analysis_options.yaml
```

---

## 4. Navigation Structure

### 4.1 Navigation Map

```
App Launch
    │
    ├── [Not Authenticated] ──▶ AuthFlow (stack)
    │   ├── LoginPage (phone input)
    │   ├── OtpVerifyPage
    │   └── ProfileSetupPage (first time)
    │
    └── [Authenticated] ──▶ MainShell (bottom nav)
        ├── Tab 0: HomePage
        │   ├── → SearchResultsPage
        │   ├── → ListingDetailPage
        │   ├── → AiAssistantPage (modal)
        │   └── → NewsListPage
        │
        ├── Tab 1: SearchPage
        │   ├── → SearchFiltersPage
        │   ├── → SearchResultsPage
        │   └── → ListingDetailPage
        │
        ├── Tab 2: SellPage (center FAB)
        │   ├── → ListingCreatePage (multi-step)
        │   │   ├── Step 1: Category + Photos
        │   │   ├── Step 2: Vehicle Details
        │   │   ├── Step 3: Price + AI Valuation
        │   │   ├── Step 4: Description (AI gen)
        │   │   └── Step 5: Preview + Publish
        │   └── → PaidListingPage (post-publish upsell)
        │
        ├── Tab 3: MessagesPage
        │   └── → ChatPage
        │
        └── Tab 4: ProfilePage
            ├── → MyListingsPage
            ├── → FavoritesPage
            ├── → SavedSearchesPage
            ├── → SettingsPage
            ├── → DealerDashboardPage (if dealer)
            └── → VinReportPage
```

### 4.2 Route Definitions

| Route Name | Path | Auth | Parameters |
|------------|------|------|------------|
| `LoginPage` | `/login` | No | — |
| `OtpVerifyPage` | `/otp-verify` | No | `phone` |
| `ProfileSetupPage` | `/profile-setup` | Yes | — |
| `HomePage` | `/` | No | — |
| `SearchPage` | `/search` | No | `query?`, `category?` |
| `SearchResultsPage` | `/search/results` | No | `filters (JSON)` |
| `ListingDetailPage` | `/listing/:id` | No | `id` |
| `ListingCreatePage` | `/listing/create` | Yes | `category?` |
| `ListingEditPage` | `/listing/:id/edit` | Yes | `id` |
| `MyListingsPage` | `/my-listings` | Yes | — |
| `AiAssistantPage` | `/ai-assistant` | No* | `session_id?` |
| `AiValuationPage` | `/valuation` | No | `listing_id?` |
| `ChatPage` | `/chat/:conversationId` | Yes | `conversationId` |
| `ProfilePage` | `/profile` | Yes | — |
| `FavoritesPage` | `/favorites` | Yes | — |
| `PaidListingPage` | `/paid-listing/:listingId` | Yes | `listingId` |
| `VinScannerPage` | `/vin/scan` | No | — |
| `VinReportPage` | `/vin/report/:vin` | Yes | `vin` |
| `FinancingPage` | `/financing` | Yes | `listing_id?` |
| `InsurancePage` | `/insurance` | Yes | `listing_id?` |
| `NewsListPage` | `/news` | No | `category?` |
| `ArticleDetailPage` | `/news/:slug` | No | `slug` |
| `DealerDashboardPage` | `/dealer` | Yes | — |
| `PartsSearchPage` | `/parts` | No | `query?` |
| `PartDetailPage` | `/parts/:id` | No | `id` |

*AI Assistant allows 5 anonymous messages before auth prompt.

### 4.3 Deep Links

| URL | Route | Use Case |
|-----|-------|----------|
| `otoyali.com/listing/{id}` | ListingDetailPage | Share listing |
| `otoyali.com/araba/{make}/{model}` | SearchResultsPage | SEO landing |
| `otoyali.com/news/{slug}` | ArticleDetailPage | Share article |
| `otoyali.com/vin/{vin}` | VinReportPage | VIN lookup |
| `otoyali.app://chat/{id}` | ChatPage | Push notification tap |

---

## 5. Page Catalog

### 5.1 Authentication Pages

#### LoginPage
- **Purpose:** Phone number entry for OTP auth
- **Components:** PhoneInput, country code picker (+90 default)
- **Actions:** Send OTP via Supabase Auth
- **Navigation:** → OtpVerifyPage

#### OtpVerifyPage
- **Purpose:** 6-digit OTP verification
- **Components:** OtpInput (6 boxes, auto-advance)
- **Actions:** Verify OTP, create session
- **Navigation:** → ProfileSetupPage (new user) or HomePage (returning)

#### ProfileSetupPage
- **Purpose:** First-time profile completion
- **Components:** AvatarUpload, DisplayNameInput, CityPicker
- **Actions:** Create profile record in Supabase
- **Navigation:** → HomePage

### 5.2 Core Marketplace Pages

#### HomePage
- **Purpose:** Main landing — featured, categories, AI assistant entry
- **Layout:**
  - AppBar with search bar + AI assistant button
  - Category chips (Araba, Motosiklet, Ticari, Yedek Parça, Servis)
  - Featured listings carousel
  - Recent listings grid
  - AI assistant FAB
  - News highlights (horizontal scroll)
- **Data:** Featured listings query, recent listings query, news query
- **Responsive:** 1 col (mobile), 2 col (tablet), 3 col (desktop)

#### SearchPage
- **Purpose:** Advanced search with filters
- **Layout:**
  - AI search bar (NL input)
  - Quick filters (make, price range, city)
  - Category tabs
  - Recent searches
  - Saved searches
- **Actions:** AI search, traditional filter search

#### SearchResultsPage
- **Purpose:** Display search results with facets
- **Layout:**
  - Results count + AI summary
  - Sort dropdown (relevance, price, date, mileage)
  - Filter chips (active filters)
  - Listing cards (list view mobile, grid tablet+)
  - Facet sidebar (desktop)
  - Infinite scroll pagination
- **Data:** Edge Function `listing-search`

#### ListingDetailPage
- **Purpose:** Full listing view — the money page
- **Layout:**
  - Image gallery (swipe, zoom, full-screen)
  - Price + AI valuation badge
  - Title + key specs row
  - Seller info + trust badge
  - Full specs table
  - Description
  - VIN report CTA
  - Financing calculator widget
  - Insurance quote CTA
  - Similar listings
  - Map (location)
  - Action bar: Favorite, Share, Message, Call
- **Data:** Listing query with relations, similar listings, valuation
- **SEO (web):** JSON-LD structured data, meta tags

#### ListingCreatePage (Multi-Step Wizard)
- **Step 1 — Category & Photos:**
  - Category selector (car/motorcycle/commercial)
  - Photo uploader (min 3, max 30)
  - VIN scanner button
  - AI: photo quality feedback, feature detection
- **Step 2 — Vehicle Details:**
  - Make/Model/Variant picker (cascading dropdowns)
  - Year, mileage, color pickers
  - Fuel, transmission, body type
  - Condition selector
  - Location picker (map)
- **Step 3 — Price & Valuation:**
  - AI valuation widget (auto-triggered)
  - Price input with valuation comparison
  - Negotiable toggle
- **Step 4 — Description:**
  - AI generate button
  - Title + description editor
  - Highlights chips
- **Step 5 — Preview & Publish:**
  - Full preview
  - Publish button
  - → PaidListingPage upsell

### 5.3 AI Pages

#### AiAssistantPage
- **Implementation:** Custom widget (not FlutterFlow native)
- **Layout:**
  - Chat message list (scrollable)
  - AI chat bubbles with embedded listing cards
  - Suggestion chips
  - Text input + send button
  - Voice input button (Phase 2)
- **Features:** SSE streaming, session persistence, tool result rendering

#### AiValuationPage
- **Purpose:** Standalone valuation tool
- **Layout:** Vehicle spec form → Valuation result with comparables

### 5.4 Profile & Settings Pages

#### ProfilePage
- My listings, favorites, saved searches
- Settings, language toggle
- Dealer dashboard link (if dealer)
- Logout

#### SettingsPage
- Language (TR/EN)
- Notification preferences
- Privacy settings
- About, terms, privacy policy
- Delete account

---

## 6. Component Library

### 6.1 Component Design Tokens

All components use shared design tokens from the theme:

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | #1A56DB | Buttons, links, active states |
| `primaryDark` | #1E429F | Pressed states |
| `secondary` | #FF6B35 | CTAs, promotions, urgent |
| `success` | #059669 | Verified, active, positive |
| `warning` | #D97706 | Caution, pending |
| `error` | #DC2626 | Errors, destructive |
| `surface` | #FFFFFF | Cards, sheets |
| `background` | #F9FAFB | Page background |
| `textPrimary` | #111827 | Headings, body |
| `textSecondary` | #6B7280 | Captions, labels |
| `border` | #E5E7EB | Dividers, borders |

### 6.2 Core Components Specification

#### ListingCard
```
Props:
  - listing: ListingStruct
  - layout: 'vertical' | 'horizontal'
  - showFavorite: bool
  - onTap: Action

Displays:
  - Cover image (16:9 aspect ratio)
  - Promotion badge (if featured/premium)
  - Title (2 lines max, ellipsis)
  - Price (formatted ₺)
  - Key specs (year, mileage, fuel)
  - Location (city)
  - Favorite button
  - AI valuation indicator (if available)
```

#### SearchBar
```
Props:
  - hint: String (localized)
  - onSearch: Action
  - onAiTap: Action
  - showAiButton: bool

Features:
  - Text input with search icon
  - AI assistant sparkle button
  - Recent searches dropdown
  - Voice input button (Phase 2)
```

#### ValuationWidget
```
Props:
  - valuation: ValuationStruct
  - showComparables: bool

Displays:
  - Predicted price (large)
  - Confidence badge (high/medium/low)
  - Price range bar
  - Market trend arrow
  - Comparables list (expandable)
  - Disclaimer text
```

---

## 7. State Management

### 7.1 Global App State (FFAppState)

```dart
class FFAppState extends ChangeNotifier {
  // Auth
  String? currentUserId;
  ProfileStruct? currentUserProfile;
  bool isAuthenticated = false;

  // Locale
  String locale = 'tr';  // 'tr' | 'en'

  // Search
  String lastSearchQuery = '';
  Map<String, dynamic> activeFilters = {};

  // AI Assistant
  String? aiSessionId;
  List<AiMessageStruct> aiMessages = [];

  // Cart / Commerce
  String? pendingListingId;  // for paid listing flow

  // UI
  int currentNavIndex = 0;
  bool isLoading = false;
}
```

### 7.2 Page-Level State

Managed by FlutterFlow's built-in page state variables:
- Form inputs, loading flags, error messages
- Pagination cursors
- Selected items (filters, categories)

### 7.3 Data Fetching Pattern

```
Page Load
    │
    ├── FutureBuilder / StreamBuilder (FlutterFlow Backend Query)
    │   ├── Supabase PostgREST query (CRUD)
    │   └── Supabase Edge Function call (business logic)
    │
    ├── Loading state → Shimmer component
    ├── Error state → ErrorState component with retry
    └── Success state → Render data
```

---

## 8. Custom Code Integration

### 8.1 When to Use Custom Code

| Feature | FlutterFlow Native | Custom Code Required |
|---------|-------------------|---------------------|
| Basic CRUD pages | ✅ | — |
| Search with filters | ✅ | — |
| Image upload | ✅ | — |
| AI chat (streaming) | — | ✅ Custom widget |
| VIN camera scanner | — | ✅ ML Kit integration |
| Google Maps picker | — | ✅ Custom widget |
| Pinch-to-zoom gallery | — | ✅ Custom widget |
| SSE streaming | — | ✅ Custom action |
| Push notification handling | Partial | ✅ Custom action |
| Deep link routing | Partial | ✅ Custom action |
| Offline cache | — | ✅ Hive service |
| Complex animations | Partial | ✅ Custom widget |

### 8.2 Custom Widget Integration Pattern

```dart
// In FlutterFlow: Add Widget → Custom Widget → ai_chat_widget.dart

// Custom widget must expose parameters FlutterFlow can bind:
class AiChatWidget extends StatefulWidget {
  const AiChatWidget({
    super.key,
    this.width,
    this.height,
    required this.sessionId,
    this.onListingTap,
  });

  final double? width;
  final double? height;
  final String? sessionId;
  final Future Function(String listingId)? onListingTap;

  @override
  State<AiChatWidget> createState() => _AiChatWidgetState();
}
```

### 8.3 Custom Action Integration Pattern

```dart
// Custom Action: vinScanner
// Returns: String? (VIN or null)

Future<String?> vinScanner(BuildContext context) async {
  final result = await Navigator.push<String>(
    context,
    MaterialPageRoute(builder: (_) => const VinCameraScanner()),
  );
  return result;
}
```

---

## 9. Supabase Integration

### 9.1 FlutterFlow Supabase Setup

```
FlutterFlow → Settings → Supabase
├── Project URL: https://{ref}.supabase.co
├── Anon Key: eyJ...
├── Auth Provider: Phone
└── Tables: (auto-import from Supabase schema)
```

### 9.2 Backend Queries (FlutterFlow)

Pre-defined queries in FlutterFlow backend:

| Query Name | Type | Table/Function | Use |
|------------|------|----------------|-----|
| `getActiveListings` | Read | listings | HomePage, Search |
| `getListingDetail` | Read | listings + relations | DetailPage |
| `getMyListings` | Read | listings (seller filter) | MyListings |
| `getVehicleMakes` | Read | vehicle_makes | Make picker |
| `getVehicleModels` | Read | vehicle_models | Model picker |
| `getFavorites` | Read | listing_favorites | FavoritesPage |
| `getConversations` | Read | conversations | MessagesPage |
| `getMessages` | Stream | messages | ChatPage |
| `getNotifications` | Stream | notifications | Notification bell |
| `getArticles` | Read | articles | NewsPage |
| `createListing` | Insert | listings | ListingCreate |
| `updateListing` | Update | listings | ListingEdit |
| `toggleFavorite` | Insert/Delete | listing_favorites | Favorite button |

### 9.3 Edge Function Calls

```dart
// Custom Action: callAiValuation
Future<ValuationStruct?> callAiValuation({
  required String makeId,
  required String modelId,
  required int year,
  required int mileageKm,
  required String city,
}) async {
  final response = await SupaFlow.client.functions.invoke(
    'ai-valuation',
    body: {
      'make_id': makeId,
      'model_id': modelId,
      'year': year,
      'mileage_km': mileageKm,
      'city': city,
    },
  );
  if (response.status == 200) {
    return ValuationStruct.fromMap(response.data['data']);
  }
  return null;
}
```

---

## 10. Internationalization (i18n)

### 10.1 FlutterFlow i18n Setup

```
Settings → Languages
├── Turkish (tr) — Primary, 100% coverage
└── English (en) — Secondary, 100% coverage
```

### 10.2 Translation Key Structure

```
# Pattern: {screen}_{element}_{variant}

# Examples:
login_title                    → "Giriş Yap" / "Sign In"
login_phone_hint               → "Telefon numaranız" / "Your phone number"
login_otp_sent                 → "Doğrulama kodu gönderildi" / "Verification code sent"

home_search_hint               → "Ne aramıştınız?" / "What are you looking for?"
home_category_cars             → "Araba" / "Cars"
home_category_motorcycles      → "Motosiklet" / "Motorcycles"

listing_price                  → "Fiyat" / "Price"
listing_mileage                → "Kilometre" / "Mileage"
listing_contact_seller         → "Satıcıya Ulaş" / "Contact Seller"

ai_assistant_title             → "Otoyali AI" / "OTOYALI AI"
ai_assistant_placeholder       → "Bir şey sorun..." / "Ask anything..."

common_save                    → "Kaydet" / "Save"
common_cancel                  → "İptal" / "Cancel"
common_loading                 → "Yükleniyor..." / "Loading..."
common_error                   → "Bir hata oluştu" / "An error occurred"
common_retry                   → "Tekrar Dene" / "Retry"

currency_format                → "₺{amount}" / "₺{amount}"
mileage_format                 → "{km} km" / "{km} km"
```

### 10.3 Dynamic Content Localization

- Listing content: stored in user's locale at creation time
- News articles: `article_translations` table for multi-language
- AI responses: locale passed to Edge Function, LLM responds in requested language
- Error messages: API returns localized messages based on `Accept-Language`

### 10.4 Turkish-Specific Formatting

```dart
// Currency: ₺1.234.567 (dot as thousands separator)
NumberFormat.currency(locale: 'tr_TR', symbol: '₺', decimalDigits: 0)

// Date: 29 Haziran 2026
DateFormat('d MMMM y', 'tr_TR')

// Phone: +90 555 123 45 67
// Plate: 34 ABC 123
```

---

## 11. Responsive Design

### 11.1 Breakpoints

| Name | Width | FlutterFlow Setting | Layout |
|------|-------|--------------------|----|
| Mobile | < 479px | Phone | Single column, bottom nav |
| Mobile Large | 479–767px | Phone Landscape | Single column, bottom nav |
| Tablet | 768–991px | Tablet | Two column, side nav option |
| Desktop | 992–1279px | Desktop | Multi-column, top nav + sidebar |
| Desktop Large | ≥ 1280px | Desktop Large | Max-width 1280px container |

### 11.2 Responsive Component Behavior

| Component | Mobile | Tablet | Desktop |
|-----------|--------|--------|---------|
| Navigation | Bottom nav | Bottom nav | Top nav + sidebar |
| Listing grid | 1 column | 2 columns | 3-4 columns |
| Search filters | Bottom sheet | Side panel | Persistent sidebar |
| Listing detail | Full page | Full page | Split view (images left, info right) |
| AI assistant | Full page modal | Side panel (400px) | Side panel (400px) |
| Chat | Full page | Full page | Split view (list + chat) |

### 11.3 FlutterFlow Responsive Settings

Each component has responsive overrides per breakpoint:
- Visibility (show/hide per breakpoint)
- Width/Height (fill, fixed, percentage)
- Padding/Margin (scaled)
- Column count (for grids)
- Font size (scaled)

---

## 12. Theme & Design System

### 12.1 Typography

| Style | Font | Size | Weight | Line Height |
|-------|------|------|--------|-------------|
| Display | Inter | 32px | 700 | 1.2 |
| H1 | Inter | 24px | 700 | 1.3 |
| H2 | Inter | 20px | 600 | 1.3 |
| H3 | Inter | 18px | 600 | 1.4 |
| Body | Inter | 16px | 400 | 1.5 |
| Body Small | Inter | 14px | 400 | 1.5 |
| Caption | Inter | 12px | 400 | 1.4 |
| Button | Inter | 16px | 600 | 1.0 |
| Price | Inter | 22px | 700 | 1.2 |

### 12.2 Spacing Scale

```
4px  (xs)  — icon padding, tight gaps
8px  (sm)  — component internal padding
12px (md)  — between related elements
16px (base) — standard padding
24px (lg)  — section spacing
32px (xl)  — major section gaps
48px (2xl) — page section separators
```

### 12.3 Component Styles

```
Buttons:
  Primary: bg primary, text white, radius 12px, height 48px
  Secondary: bg white, border primary, text primary
  Ghost: bg transparent, text primary
  Destructive: bg error, text white
  FAB: bg secondary, icon white, radius 16px, shadow lg

Cards:
  bg surface, radius 16px, shadow sm, padding 0 (image flush top)

Input Fields:
  bg white, border border, radius 12px, height 48px
  Focus: border primary, shadow ring

Chips:
  bg background, radius 20px, padding 8px 16px
  Active: bg primary/10, text primary, border primary
```

---

## 13. Asset Management

### 13.1 Image Assets

| Asset | Size | Format | Usage |
|-------|------|--------|-------|
| Logo (full) | 512×128 | SVG + PNG | App bar, splash |
| Logo (icon) | 512×512 | PNG | App icon, favicon |
| Category icons | 64×64 | SVG | Category chips |
| Empty states | 200×200 | SVG | No results, no favorites |
| Onboarding | 300×300 | PNG | Auth flow illustrations |
| Placeholder car | 800×450 | JPG | Missing listing image |

### 13.2 App Icon

```
iOS: 1024×1024 (App Store)
Android: Adaptive icon (foreground + background layers)
Web: favicon.ico + 192×192 + 512×512 manifest icons
```

---

## 14. Custom Actions & Functions

### 14.1 Custom Actions Catalog

| Action | Input | Output | Phase |
|--------|-------|--------|-------|
| `sendOtp` | phone | success/error | P0 |
| `verifyOtp` | phone, code | session | P0 |
| `uploadListingImage` | file, listingId | url | P0 |
| `callAiValuation` | vehicle specs | ValuationStruct | P1 |
| `callAiAssistant` | message, sessionId | AiMessageStruct | P1 |
| `callAiSearch` | query, filters | listings[] | P2 |
| `scanVin` | — | vin string | P1 |
| `getVinReport` | vin | VinReportStruct | P1 |
| `purchasePromotion` | listingId, packageSlug | payment result | P1 |
| `getFinancingQuotes` | price, downPayment, term | quotes[] | P3 |
| `getInsuranceQuotes` | vehicleData, type | quotes[] | P3 |
| `startConversation` | listingId, message | conversationId | P0 |
| `sendPushToken` | fcmToken | — | P1 |
| `trackEvent` | eventName, properties | — | P0 |
| `shareListing` | listingId | — | P0 |
| `openMaps` | lat, lng, label | — | P0 |
| `formatPrice` | amount, locale | formatted string | P0 |
| `formatMileage` | km, locale | formatted string | P0 |

### 14.2 Custom Functions

| Function | Input | Output | Description |
|----------|-------|--------|-------------|
| `formatPrice` | int amount | String | ₺1.234.567 |
| `formatMileage` | int km | String | 50.000 km |
| `formatDate` | DateTime | String | 29 Haziran 2026 |
| `calculateEmi` | principal, rate, term | int | Monthly payment |
| `validateVin` | String vin | bool | Check digit validation |
| `validatePlate` | String plate | bool | Turkish plate format |
| `getCategoryLabel` | category enum | String | Localized label |

---

## 15. Platform-Specific Configuration

### 15.1 iOS

```
Info.plist:
  NSCameraUsageDescription: "Araç fotoğrafları çekmek ve VIN taramak için"
  NSPhotoLibraryUsageDescription: "Araç fotoğrafları yüklemek için"
  NSLocationWhenInUseUsageDescription: "Konumunuzu ilanlarda göstermek için"
  NSMicrophoneUsageDescription: "Sesli arama için" (Phase 2)

Capabilities:
  Push Notifications
  Background Modes (remote-notification)
  Associated Domains (applinks:otoyali.com)
```

### 15.2 Android

```
AndroidManifest.xml:
  Permissions: CAMERA, READ_EXTERNAL_STORAGE, ACCESS_FINE_LOCATION, INTERNET
  Intent Filters: otoyali.com deep links

Firebase:
  google-services.json for FCM push notifications
```

### 15.3 Web

```
index.html:
  Meta tags for SEO
  Google Analytics / PostHog
  Structured data script
  Service worker for caching (Phase 2)

robots.txt:
  Allow: /, /araba/*, /motosiklet/*, /news/*
  Disallow: /profile, /my-listings, /chat/*
```

---

## 16. Export & Deployment Pipeline

### 16.1 Export Workflow

```
FlutterFlow Designer
    │
    ├── Export Code → GitHub (otoyali_app repo)
    │   ├── FlutterFlow auto-commits to `flutterflow/` branch
    │   └── Custom code in `lib/custom_code/` preserved (not overwritten)
    │
    ├── CI Trigger (GitHub Actions)
    │   ├── Merge flutterflow/ → develop/
    │   ├── Resolve conflicts (custom code protected)
    │   ├── flutter analyze
    │   ├── flutter test
    │   ├── Build iOS (Fastlane)
    │   ├── Build Android (Fastlane)
    │   └── Build Web (Flutter web build)
    │
    └── Deploy
        ├── iOS → TestFlight → App Store
        ├── Android → Internal Track → Production
        └── Web → Cloudflare Pages
```

### 16.2 Custom Code Protection

```gitattributes
# .gitattributes — protect custom code during FF export merge
lib/custom_code/** merge=ours
lib/main.dart merge=ours  # if customized
```

---

## 17. FlutterFlow Limitations & Workarounds

| Limitation | Impact | Workaround |
|------------|--------|------------|
| No SSE streaming | AI chat can't stream | Custom widget with EventSource |
| Limited map integration | Location picker basic | Custom Google Maps widget |
| No camera ML | VIN scanner impossible | Custom ML Kit widget |
| Complex animations | Delight micro-interactions | Custom animated widgets |
| Code merge conflicts | FF export overwrites | Git merge strategy, `custom_code/` protection |
| No offline support | Poor connectivity UX | Custom Hive cache service |
| Web SEO limited | Flutter Web SEO challenges | Pre-rendered landing pages (separate) |
| Large app size | FF generates verbose code | Tree shaking, deferred loading |
| No unit test generation | Testing gap | Manual test writing in `test/` |

---

## Document References

| Document | Purpose |
|----------|---------|
| [API_DESIGN.md](./API_DESIGN.md) | Backend API contracts |
| [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) | Backend configuration |
| [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md) | Coding standards |
| [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | Architecture context |

---

*FlutterFlow is the UI layer. All business logic lives in Supabase Edge Functions. Custom code fills the gaps FlutterFlow cannot address.*
