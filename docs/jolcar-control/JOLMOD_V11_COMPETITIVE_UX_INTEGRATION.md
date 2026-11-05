# JOLMOD V11 — competitive UX integration evidence

## Baseline and scope

- **Baseline HEAD:** `618433bbcdcfb41ad7b404a45a3b1448f8e5177f`
- **Branch:** `jolcar/autonomous`
- **Mode:** local implementation only; no migration, remote Supabase, Vercel, provider, DNS or production action.
- **Final HEAD:** recorded after the local commit for this pass.

## Implemented in this pass

1. **Progressive search:** Search filters now present Make → Model → Price before the advanced surface. Vehicle category and Sale/Rent purpose remain available under All filters; no search capability was removed.
2. **Vehicle card contract:** price now leads vehicle identity, the approved 4:3 media contract remains intact, and the video label no longer creates a third prominent image badge. Seller/category/purpose are concise metadata, not stacked status pills.
3. **Trust Ledger shell:** public listing detail now presents an explicit source/scope/freshness shell: seller-provided information, Jolmod publication context, and a clear external-history-not-connected state. It makes no accident, lien, owner, mileage or legal-history claim.
4. **Supabase CLI reproducibility:** `npm run check:supabase-cli` validates CLI `2.115.0` using `supabase` on PATH or a portable binary supplied through `SUPABASE_CLI_BIN`. No executable path or runtime dependency is committed.

## Already correct / retained

- 4:3 card media, live search count contract, URL-backed search state, mobile filter drawer, saved search, protected seller contact, optional VIN/provider boundary, Rent classified-lead copy and structured commercial attributes already existed.
- Dealer public/CRM source attribution, Buyer Requests, AI optionality/explainability, notification privacy and vertical capability registry are existing scope and were not rewritten without a proven defect.

## Verification

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run test:jlc-0402` | PASS |
| `npm run test:listing-detail-localization` | PASS |
| `npm run test:jlc-1303` | PASS |
| `npm run test:v11-competitive-ux` | PASS |
| `npm run lint` | PASS with unchanged `SafeImage` `<img>` advisory |
| `npm run build` | PASS; Next production build completed and wrote `.next/BUILD_ID` |
| `git diff --check` | PASS |
| `npm run test:jlc-0405` | ENVIRONMENT_DEFECT: local Supabase Docker container `supabase_db_Otoyali-blueprint` is absent |
| `npm run check:supabase-cli` | EXTERNAL_MANUAL_GATE: CLI 2.115.0 is not available on PATH and no portable binary is configured |

## i18n, accessibility, performance and security

- Trust Ledger copy is implemented in **ru**, **kk**, **en** and **zh-CN**; the existing Russian fallback stays intact.
- The ledger is a semantic labelled section, does not rely on colour for meaning, and introduces no client fetch, provider call or new dependency.
- Card/search changes retain existing responsive classes, 44px image-navigation targets and 4:3 image loading path.
- No RLS, API authorization, contact visibility, saved-search, buyer-request or CRM contract changed.

## Remaining manual/external gates

- Start the disposable local Supabase stack and provide the validated CLI 2.115.0 to run DB-backed regression suites.
- Perform local visual review at 390px/768px against seeded staging-like fixtures. This pass does not assert production readiness.
- Production remains paused and unchanged.
