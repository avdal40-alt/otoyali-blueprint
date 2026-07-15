# Auth And Access

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

Current product strategy:

- phone-first OTP
- no email/password as the main product strategy
- friendly Turkish error when SMS/provider is unavailable

Current production gap:

- SMS provider is not configured yet. Plan AUTH-02 or SMS-01 before launch.

## Admin Access

Do not hardcode admins in the frontend. Do not use localStorage admin flags.

Use:

- `public.admin_users`
- `public.is_admin(uid uuid)`
- `public.admin_role(uid uuid)`

Admin pages must stay excluded from sitemap and disallowed in robots.
