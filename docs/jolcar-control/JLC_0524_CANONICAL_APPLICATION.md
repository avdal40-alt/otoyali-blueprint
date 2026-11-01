# JLC-0524 canonical application

Date: 2026-11-02 (Asia/Qyzylorda)  
Canonical project: `dmjifqbvbjewyigdsuco` — avdal40-alt's Project, `ap-south-1`  
Production Vercel: paused; not changed.

## Scope and target verification

- Initial and final application head: `43afe96459edc7f9cf82081e88bd12b8ce2de88d`
- Worktree was clean before application.
- The repository link was verified as `dmjifqbvbjewyigdsuco`; the separate
  `uivazzvxelptjmbbfvir` / Otoyali project was unlinked and not used.
- `supabase db push --linked --skip-vault --dry-run` listed exactly one
  migration and no seeds or roles:
  `20261101130000_jlc_0524_kazakhstan_seller_phone_eligibility.sql`.

## Application and parity

- Applied once through `supabase db push --linked --skip-vault --yes`.
- No migration repair, reset, manual DDL, seed, role, vault, Auth, or Vercel
  operation was used.
- Reconciled pre-apply parity: 182 local / 181 remote / 1 pending.
- Post-apply parity: 182 local / 182 remote / 0 pending.
- A canonical read-only history query found exactly one row for version
  `20261101130000`.

### Count reconciliation

Earlier 181-count evidence was stale. Git proves that commit `d33aa2f`
added JLC-0524 to a pre-existing 181-file migration history, making the local
history 182 files before application. The canonical history now contains those
same 182 unique versions: no local-only, remote-only, duplicate, or
migration-repair artifact was found.

## Country eligibility contract

The deployed private immutable helper
`identity.is_kazakhstan_e164_phone(text)` recognizes the current Kazakhstan
allocations inside the shared `+7` zone: `+70`, `+76`, and `+77`. It rejects
Russian `+79` and non-Kazakhstan `+90` examples.

Read-only canonical results:

- `+70`: eligible
- `+76`: eligible
- `+77`: eligible
- `+79`: rejected
- `+90`: rejected

The deployed seller-contact guard requires a non-null contact owned by the
seller, active, unrevoked, and eligible under that helper. The authenticated
public eligibility/list RPCs are owner-scoped; the classifier itself is not a
SECURITY DEFINER function and is executable only by `service_role`. This keeps
international account registration/login independent of Kazakhstan seller
eligibility while requiring a verified KZ-numbered seller contact for KZ
listing lifecycle actions.

The local transaction-scoped runtime matrix rolled back all fixtures and
verified KZ contacts, Russian/non-KZ rejection, unverified-contact rejection,
cross-owner rejection, direct legacy-wrapper denial, and verified-contact OTP
reuse.

## Regression

Passed:

- `test:seller-country-phone-eligibility`
- `test:seller-country-phone-eligibility:runtime`
- `test:phone-auth`, `test:phone-policy`, seller-contact flow and manager
- `test:jlc-0519`, `test:jlc-0522`, `test:country-config`
- `typecheck`
- `lint` (only the pre-existing SafeImage `<img>` advisory remains)
- `git diff --check`

## Security review

No new anonymous seller-write path, owner-spoof path, contact-ownership bypass,
RLS weakening, or grant widening was introduced. The two new Security Advisor
entries are expected authenticated SECURITY DEFINER advisories for the new
owner-scoped eligibility/list RPCs. Their definitions require `auth.uid()` and
their contact lookup is constrained to the authenticated owner's active,
unrevoked contacts. The classifier is private and not a SECURITY DEFINER
function. Canonical Security Advisor still reports the wider pre-existing
project findings, including the historical SECURITY DEFINER view and disabled
leaked-password protection.

Production data and Vercel production remained unchanged apart from the
authorized schema migration itself.

## Post-application staging gate

- Runtime source commit: `84fc6f34a4a94fcb85549e94824917a08c28590b`
- Staging project: `jolcar-staging` (`prj_pprF8wVDXI77cPz6H1Lox0nYsMyi`)
- Preview deployment: `dpl_HBtVMN6frCKuiszC2us4DJ3jk5VY`
- Preview URL: `https://jolcar-staging-8k51y4gmx-otoyali.vercel.app`
- Vercel build: READY
- Local `npm run build`: PASS, including page-data generation and build traces.
- Protected-preview requests returned HTTP 200 for home, search, login,
  registration, forgot password, sell, settings, and `/auth/callback`.
  `/ru` correctly redirects to `/` and stores the Russian locale; `kk`, `en`,
  and `zh-CN` respond successfully.
- The staging Preview public Supabase URL was verified without printing it and
  resolves to canonical project `dmjifqbvbjewyigdsuco`.

Authenticated seller proof remains a manual, controlled smoke: use existing
non-customer accounts only. Verify an international account without a KZ seller
contact can browse/login but is blocked at seller eligibility; verify a
separate international account with an already-verified `+70`, `+76`, or `+77`
seller contact reaches the seller flow; verify an account with only an existing
verified `+79` contact remains blocked. Do not add users, phone numbers, or
listings merely for this readiness gate.
