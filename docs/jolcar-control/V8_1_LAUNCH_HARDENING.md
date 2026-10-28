# V8.1 launch hardening evidence — 2026-10-28

## Scope and production safety

- Branch: `jolcar/autonomous`
- Starting production baseline: canonical Supabase `dmjifqbvbjewyigdsuco`.
- Migration inspection reconfirmed `180 local / 180 remote / 0 pending`.
- Production remains paused. This pass performed no production migration, data,
  Auth, DNS, callback, environment, or production-deployment mutation.

## Completed safe corrections

- `dcc7949` repairs two local moderation/draft PostgREST fixtures which still
  used Turkey-era Ankara/TRY/null-city inputs. They now resolve an active Almaty
  city at runtime, use KZT, and use a disposable canonical E.164 `+7` seller
  contact. The fixtures clean their own local records. No production behavior,
  RLS, market trigger, or seller authorization was weakened.
- `35d4388` aligns a seller-contact test with the active launch copy module.
- `590b0a1` aligns the listing-contact edit-flow test with the active
  four-language sell-wizard dictionary.
- `6392397` repairs two older seller-media runtime fixtures to use KZ/KZT,
  canonical Almaty city data, the v2 verified-contact create contract, and the
  non-enumerating HTTP authorization response. Their direct RPC/API and
  no-partial-state media matrix passes.
- `371f035` excludes local autonomous diagnostic logs from Preview uploads;
  it does not alter application source or Vercel production settings.

## Local verification

### Market, lifecycle, moderation, and security

All passed locally after the fixture repair:

- `test:country-config`, `test:jlc-0521`, `test:jlc-0522`
- `test:launch-03d3c3-postgrest-rpc`,
  `test:launch-03d3c3-draft-lifecycle`,
  `test:launch-03d3c3-draft-runtime-rls`,
  `test:launch-03d3c5-admin-moderation`
- `test:jlc-0514`, `test:jlc-0517`
- `test:security-lifecycle`, `test:security-02f`,
  `test:security-final-profile-privacy`,
  `test:security-final-seller-identity`, `test:security-final-storage`,
  `test:security-final-r2`, `test:security-final-dependencies`, and
  `test:security-final-media-reference`

The role matrices cover anonymous, authenticated, owner, non-owner, staff,
and intentional service-role behavior. Expected denial messages in local tests
were asserted and did not indicate a regression.

### Auth, i18n, SEO, and active client surfaces

All passed locally:

- `test:phone-auth`, `test:auth-return-path`, `test:auth-localization`,
  `test:auth-signup-metadata`, `test:launch-b01a`, `test:launch-b01b1`,
  `test:launch-b01b2`
- `test:i18n-foundation`, `test:i18n-routing`, `test:jlc-1201`,
  `test:marketplace-seo-localization`, `test:category-seo-localization`, and
  `test:dynamic-seo-localization`
- favorites, saved-searches, notifications, messages, status, video, dealer,
  services, listing-detail, AI client, AI response-language, and service-format
  four-language contracts.

The isolated i18n runtime test built normal and maintenance modes and confirms
that `/tr/about` is terminal 404; released public locale negotiation remains
`ru`, `kk`, `en`, and `zh-CN`, with Russian default/fallback. The legacy `/tr`
root compatibility page remains outside locale negotiation and is not a launch
locale or fallback.

### Build and performance

- The isolated routing production builds passed. Shared first-load JS is
  approximately `103 kB`; public search is `272 kB`; listing detail is `270 kB`.
  No material public-path bundle regression was observed.
- `SafeImage` intentionally uses sanitized persisted media derivatives with
  `srcset`, `sizes`, native lazy loading, async decode, and error fallback.
  A mechanical conversion to `next/image` would alter arbitrary/signed Supabase
  URL and privacy/cache behavior without evidence of an improvement. The
  existing lint advisory is retained and documented as performance follow-up,
  not suppressed.
- `test:jlc-1403` responsive-media delivery contract passed.

## Preview evidence

- Preview project: `jolcar-staging` (separate from paused `jolcar` production).
- The reviewed source at `371f035` was deployed Preview-only as
  `dpl_4DRfcb6NvXUoKzksr5iDuouxe7hC` and reached `READY`.
- Public SSO-authenticated checks returned success for `/`, `/kk`, `/en`,
  `/zh-CN`, `/search`, `/sell`, `/login`, `/register`, `/legal`, `/contact`,
  `/trust`, `/sitemap.xml`, and `/robots.txt`; `/ru` performed the expected
  canonical redirect to unprefixed Russian. No authenticated mutation, SMS, or
  paid AI action was performed.
- Current reviewed HEAD was then deployed Preview-only as
  `dpl_CNz1XiDCaQu7rdEaPXKtso1F3ms2` at
  `https://jolcar-staging-f3e70meow-otoyali.vercel.app` and reached `READY`
  (build: 1m05s). Fresh protected smoke returned `200` for `/`, `/kk`, `/en`,
  `/zh-CN`, `/search`, `/sell`, `/login`, `/register`, `/legal`, `/contact`,
  `/trust`, `/sitemap.xml`, and `/robots.txt`; `/ru` was `307` and
  `/tr/about` was `404` as required. Production was not deployed or promoted.
- Preview environment-name inventory has public Supabase settings and AI
  feature configuration, but no explicit application Site URL/redirect callback
  variable was found. Supabase Auth dashboard values remain owner verification.

## Auth and remaining controlled proof

- Normal login is phone plus password; registration/recovery/legacy enrollment
  are the OTP paths. Local source and runtime contracts confirm routine login
  does not send an OTP.
- Production SMS provider health, KZ +7 delivery, Site URL, redirect URLs, and
  callbacks are not observable through the permitted CLI session. No SMS was
  sent.
- Security Advisor previously reported leaked-password protection disabled.
  This is a provider setting and a GO-LIVE blocker, not an application/RLS
  defect. The supported owner action is: in the canonical Supabase project,
  open Auth password-security settings, enable leaked-password protection,
  save, then test a controlled password enrollment/reset against a known leaked
  password and a normal existing-password login. This check applies to new or
  changed passwords; it should not invalidate existing credentials. Roll back
  by disabling the setting only if the controlled test identifies an
  incompatibility.
- RC4B found no approved dedicated verified KZ +7 seller. Two discovered
  verified contacts were treated as real accounts and were not used. Therefore
  JLC-0522 and the two-actor legal-acceptance runtime proof remain intentionally
  incomplete rather than bypassed.

## RC4C executable checklist

After the owner supplies a dedicated non-customer Kazakhstan `+7` identity and
authorizes one minimum OTP/password flow, use it to prove:

1. Draft creation binds KZ and KZT with an active KZ city; TRY, TR city, and
   market spoof inputs fail closed.
2. Edit, submit, and resubmit retain the KZ/KZT binding; ownership and
   staff/seller separation remain enforced.
3. The controlled KZ fixture plus a known legacy TR fixture prove KZ-only
   search, detail, related, dealer, saved-search, and count/facet surfaces.
4. Two controlled actors prove legal-acceptance own insert/read and rejection
   of cross-user read/insert, update, delete, and anonymous persistence.

Do not use real customer accounts, alter historical Turkey rows, or retain
unnecessary test listings. Append-only legal evidence should be retained when
created rather than deleted for convenience.

## Owner-controlled GO-LIVE blockers

1. Dedicated approved KZ `+7` smoke identity and minimum provider-authorized
   OTP/password verification.
2. Supabase Auth dashboard verification of phone/SMS provider, KZ delivery,
   Site URL, allowed redirect URLs, and callbacks.
3. Enable and recheck leaked-password protection.
4. Final custom-domain, DNS, canonical URL, sitemap/robots host, and Supabase
   callback configuration decision.
5. Approved legal operator facts: entity name, BIN/IIN as applicable, legal
   address, representative, support contact, and legal contact; Kazakhstan
   legal review of the launch documents.
6. After those gates: controlled RC4C proof, current-HEAD Preview deployment
   and authenticated Preview smoke, paused-production deployment verification,
   then explicit owner go-live authorization.

## Rollback readiness

Application rollback is Vercel deployment/alias rollback to the last verified
deployment. Auth setting rollback is the corresponding dashboard toggle after
controlled verification. No destructive database rollback is planned; the
applied migrations are additive and production data remains preserved.
