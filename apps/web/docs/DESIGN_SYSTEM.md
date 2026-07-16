# OTOYALI Design System

FOUNDATION-01 establishes a shared UI foundation for the web MVP. It is not a redesign. It makes the current product more consistent and gives future modules one reusable system.

## Principles

- Guest-first marketplace UI stays fast, plain, and readable.
- New modules must reuse tokens and primitives before adding page-local styles.
- Business logic, Supabase access, auth, and routes stay outside the design system.
- Orange is reserved for publish/CTA moments.
- Video, admin, legal, marketplace, and future verticals use the same typography, radius, shadows, and status language.

## Token Source

Single source of truth:

```text
src/lib/design-system/tokens.ts
```

Tailwind consumes these tokens through:

```text
tailwind.config.ts
```

CSS variables live in:

```text
src/app/globals.css
```

Use `oto-*` Tailwind classes or exported components instead of hardcoded page-local colors where possible.

## Colors

Core tokens:

- `oto-bg`, `oto-background`: page background
- `oto-surface`, `oto-surfaceRaised`, `oto-surfaceMuted`: panels and muted surfaces
- `oto-text`, `oto-textSoft`, `oto-muted`: text hierarchy
- `oto-border`, `oto-borderStrong`: dividers and inputs
- `oto-blue`: primary action/accent
- `oto-cyan`: secondary accent
- `oto-orange`: publish/CTA highlight
- `oto-success`, `oto-warning`, `oto-danger`, `oto-info`: status colors
- `oto-skeleton`, `oto-hover`, `oto-disabled`, `oto-focus`: interaction states

Future dark mode variables are prepared in `globals.css` under `:root[data-theme="dark"]`. Do not add a theme switch until a product task explicitly requests it.

## Typography

Use the Tailwind text tokens:

- `text-h1`
- `text-h2`
- `text-h3`
- `text-title`
- `text-subtitle`
- `text-body`
- `text-caption`
- `text-badge`
- `text-button`
- `text-label`
- `text-helper`
- `text-error`

Shared helpers:

```text
src/components/ui/Typography.tsx
```

Use `Heading` and `Text` for new shared modules when page-local semantic markup is not already clearer.

## Spacing

Use the shared spacing scale from `designTokens.spacing`:

```text
0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 10, 12, 16, 20, 24
```

Avoid one-off spacing unless a layout genuinely needs it. Repeated cards, forms, drawers, and admin rows should use this scale.

## Radius, Borders, Shadows

Radius tokens:

- `rounded-sm`
- `rounded-md`
- `rounded-lg`
- `rounded-xl`
- `rounded-card`
- `rounded-modal`
- `rounded-avatar`
- `rounded-button`
- `rounded-oto` remains as a compatibility alias

Shadow tokens:

- `shadow-soft`: default cards and panels
- `shadow-oto`: stronger hover or sticky surfaces
- `shadow-card`: dense card surfaces
- `shadow-modal`: modal and drawer overlays
- `shadow-focus`: accessible focus emphasis

## Components

Shared UI primitives live in:

```text
src/components/ui
```

Exports are also available from:

```text
src/components/ui/index.ts
```

### Buttons

File: `src/components/ui/Button.tsx`

Variants:

- `primary`
- `secondary`
- `ghost`
- `outline`
- `danger`
- `orange`

Sizes:

- `sm`
- `md`
- `lg`

Supports `leftIcon`, `rightIcon`, `isLoading`, disabled states, and `ButtonLink`.

### Inputs

File: `src/components/ui/Input.tsx`

Available controls:

- `Input`
- `SearchInput`
- `PhoneInput`
- `NumberInput`
- `Textarea`
- `Select`
- `Checkbox`
- `Radio`
- `Toggle`

All text controls support helper text, error state, disabled state, and loading state.

### Cards

File: `src/components/ui/Card.tsx`

Variants:

- `default`
- `listing`
- `category`
- `seller`
- `video`
- `admin`
- `placeholder`

Use for new repeated surfaces. Do not wrap cards inside cards.

### Badges

File: `src/components/ui/Badge.tsx`

Variants:

- `neutral`
- `primary`
- `success`
- `warning`
- `danger`
- `info`
- `pending`
- `active`
- `rejected`
- `archived`
- `draft`
- `featured`
- `gallery`
- `new`
- `ai`

Status badges should use token variants rather than page-local color classes.

### Modal And Drawer

Files:

```text
src/components/ui/Modal.tsx
src/components/ui/Drawer.tsx
```

Use `Modal` for centered or mobile-bottom dialogs. Use `Drawer` for filter panels, mobile menus, and future module side panels. Both include ARIA dialog semantics and tokenized animation.

### Loading And Empty States

File: `src/components/ui/States.tsx`

Available states:

- `EmptyState`
- `LoadingState`
- `ErrorState`
- `Spinner`
- `PageLoader`
- `Skeleton`
- `SkeletonCard`
- `ImagePlaceholder`

Use these for search, favorites, profile, listings, video, and admin empty states.

### Icons

File: `src/components/ui/Icon.tsx`

The app does not currently depend on an external icon package. New shared UI should use the `Icon` wrapper so icon sizing, stroke, and accessibility stay consistent. If a future task adds an icon library, migrate through this wrapper instead of mixing icon sources.

## Layout

Shared layout helpers:

```text
src/components/layout/PageContainer.tsx
```

- `PageContainer`: consistent page max width, horizontal padding, and bottom spacing.
- `PageBand`: reusable vertical section rhythm.
- `SectionHeader`: shared section title/eyebrow/action pattern.

## Responsive Rules

- Mobile-first classes remain the default.
- Keep Home/Search/listing cards fixed-ratio to avoid layout shift.
- Use drawers for mobile-heavy secondary controls.
- Keep listing cards and SEO pages free of real video files.
- Avoid changing route behavior to solve layout issues.

## Accessibility

- Global `:focus-visible` is tokenized.
- Buttons and links expose disabled/loading state where supported.
- Modals and drawers use `role="dialog"` and `aria-modal`.
- Empty/error/loading states include readable text and appropriate alert/live behavior.
- Form fields expose `aria-invalid` when errors exist.

## Animation

Use the shared duration tokens:

- `duration-fast`
- `duration-base`
- `duration-slow`

Animations:

- `animate-oto-fade-in`
- `animate-oto-slide-up`
- `animate-oto-drawer-in`

Global reduced-motion support is enabled in `globals.css`.

## Future Modules

Commercial Vehicles, Marine, Parts, Insurance, and AI Assistant should start from this foundation:

- Use `PageContainer`, `SectionHeader`, `Card`, `Button`, `Input`, `Badge`, and `States`.
- Add domain-specific copy/data only in module files.
- Add new tokens only when multiple modules need the same concept.
- Do not add new database assumptions from UI foundation work.

## Future Themes

The token model supports future brand rename, accent color shifts, seasonal themes, and dark mode. Theme switching is intentionally not implemented yet.
