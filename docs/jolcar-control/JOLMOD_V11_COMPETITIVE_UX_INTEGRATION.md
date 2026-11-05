# JOLMOD V11 — competitive UX integration evidence

## Baseline and scope

- **Baseline HEAD:** `00ef21ff6eeec7517a6f4875621e951bddb7bc1c`
- **Branch:** `jolcar/autonomous`
- **Mode:** local implementation only; no migration, remote Supabase, Vercel, provider, DNS or production action.
- **Final HEAD:** recorded after the local commit for this pass.

## Implemented in this pass

1. **Progressive search:** Search filters now present Make → Model → Price before the advanced surface. Vehicle category and Sale/Rent purpose remain available under All filters; no search capability was removed.
2. **Vehicle card contract:** price now leads vehicle identity, the approved 4:3 media contract remains intact, and the video label no longer creates a third prominent image badge. Seller/category/purpose are concise metadata, not stacked status pills.
3. **Trust Ledger shell:** public listing detail now presents an explicit source/scope/freshness shell: seller-provided information, Jolmod publication context, and a clear external-history-not-connected state. It makes no accident, lien, owner, mileage or legal-history claim.
4. **Supabase CLI reproducibility:** `npm run check:supabase-cli` validates CLI `2.115.0` using `supabase` on PATH or a portable binary supplied through `SUPABASE_CLI_BIN`. No executable path or runtime dependency is committed.
5. **Home quick-search correction:** final visual review found category and listing-purpose controls ahead of Make/Model/Price on the home surface. They were moved into All filters, and the JLC-0402 static contract now prevents that regression.

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
| `SUPABASE_CLI_BIN=<local 2.115.0 binary> npm run check:supabase-cli` | PASS |
| Disposable detached worktree | PASS: unlinked; no `supabase/.temp` or `supabase/branches` marker |
| `supabase start` (disposable worktree) | PASS: local Docker stack started with CLI 2.115.0 |
| `npm run test:jlc-0405` | PASS against the disposable local stack |
| `npm run test:security-04a` | PASS from the unlinked disposable worktree |
| `npm run test:jlc-1302` | PASS against the disposable local stack (aggregate buyer/public flow) |
| JLC-1606 | No npm script exposed; not applicable |

## i18n, accessibility, performance and security

- Trust Ledger copy is implemented in **ru**, **kk**, **en** and **zh-CN**; the existing Russian fallback stays intact.
- The ledger is a semantic labelled section, does not rely on colour for meaning, and introduces no client fetch, provider call or new dependency.
- Card/search changes retain existing responsive classes, 44px image-navigation targets and 4:3 image loading path.
- No RLS, API authorization, contact visibility, saved-search, buyer-request or CRM contract changed.

## Visual validation and remaining local limitation

- Browser inspection at **390px** confirmed Make → Model → Price before All filters; category and listing purpose are only in the advanced surface. A **768px** inspection confirmed the responsive search shell. The Kazakh home route displayed localized Kazakh interface text and the same corrected control order.
- The normal local server at `http://localhost:3000` had no Supabase environment variables, so the search route correctly displayed its local missing-environment state rather than listing cards.
- A separate disposable fixture-backed server was started with a valid local URL, but its server runtime still reported an invalid Supabase URL. No data-backed card/detail/trust/sell/buyer-request/rent/dealer/AI/alert/vertical browser assertions are claimed from that failed fixture launch.
- Production remains paused and unchanged.
- Production remains paused and unchanged.
