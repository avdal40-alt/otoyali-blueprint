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
- Pre-apply parity: 181 local / 180 remote / 1 pending.
- Post-apply parity: 181 local / 181 remote / 0 pending.
- A canonical read-only history query found exactly one row for version
  `20261101130000`.

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
RLS weakening, or grant widening was introduced. Canonical Security Advisor
still reports the pre-existing wider project findings, including historical
SECURITY DEFINER advisories and disabled leaked-password protection. The new
JLC-0524 surface is authenticated-only at its public lifecycle RPCs and retains
explicit owner and verified-contact checks.

Production data and Vercel production remained unchanged apart from the
authorized schema migration itself.
