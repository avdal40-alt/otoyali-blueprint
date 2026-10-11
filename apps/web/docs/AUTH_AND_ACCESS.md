# Auth And Access

> **Jolcar status (2026-10-11):** This document records inherited web
> implementation. It does not define Jolcar auth policy. The current active
> implementation remains Turkey-oriented; Jolcar’s approved target is in
> [DECISIONS O-005](../../../docs/jolcar-control/DECISIONS.md) and its rollout
> remains task-queue controlled. See the
> [documentation reconciliation](../../../docs/jolcar-control/DOCUMENTATION_RECONCILIATION.md).

## Philosophy

- Guest First: browsing must not require login.
- Progressive Auth: require login only for identity-dependent actions.
- Lazy Profile: profile data should be created or requested only when needed.
- Return to Context: login and OTP flows preserve `next`.
- Logout returns the user to guest mode, not a forced login wall.

## Public Without Login

- `/`
- `/search`
- `/listing/[id]`
- `/video`
- SEO landing pages
- WEB-09 future vertical placeholders
- Legal/trust pages
- `/news`

## Login Required

- `/sell`
- `/profile`
- `/my-listings`
- `/favorites`
- contact seller action
- save search
- report listing
- `/admin` plus active admin role

## Seller Publish Flow

- Guests who open `/sell` are sent to `/login?next=/sell`.
- OTP/login must preserve `next=/sell`; users should return to the publish flow after auth.
- Seller profile completion is lazy and happens inside `/sell` only when publishing requires it.
- Required MVP seller profile fields are seller type, display/gallery name, city, and phone from auth when available.
- MVP seller types are only `Bireysel` and `Galeri`; do not add a third seller type yet.
- Published listings start hidden from public browsing as `status = draft` and `moderation_status = pending_review`.
- Public listing visibility requires `status = active` and `moderation_status = active`.
- Owners can view their own drafts/pending listings in `/my-listings`; guests cannot read private drafts.

## Auth Method

Current inherited implementation:

- phone-first OTP and no email/password as the main product strategy
- global international phone-number parsing with Türkiye selected by default
- users may enter a national number for the selected country or paste an international `+` number
- OTP phone transfer uses short-lived per-tab `sessionStorage`; full phone numbers are not placed in the OTP URL by the current flow
- safe, categorized auth errors; raw provider messages are not shown in the browser UI
- 60-second OTP resend cooldown in the client

Approved Jolcar target (not yet implemented by this document): first
registration uses one OTP followed by mandatory password enrollment; routine
login uses phone plus password with no routine OTP. Jolcar uses `+7`; OTP is
reserved for registration, recovery, phone change/additional verified contact,
and genuinely sensitive actions. Production SMS activation remains separately
authorized.

Current production gap:

- Production SMS delivery still depends on Supabase Dashboard configuration and the external SMS provider. Code cannot confirm provider readiness without the production project settings.

## Admin Access

Do not hardcode admins in the frontend. Do not use localStorage admin flags.

Use:

- `public.admin_users`
- `public.is_admin(uid uuid)`
- `public.admin_role(uid uuid)`

Admin pages must stay excluded from sitemap and disallowed in robots.
