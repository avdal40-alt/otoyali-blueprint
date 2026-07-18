# Admin And Moderation

## Routes

- `/admin`
- `/admin/listings`
- `/admin/videos`
- `/admin/services`
- `/admin/reports`
- `/admin/users`
- `/admin/settings`

Admin routes are not public product pages. They should require an authenticated user with an active admin row.

## Database Objects

- `public.admin_users`
- `public.admin_audit_logs`
- `marketplace.reports`
- `service_marketplace.provider_applications`
- `public.service_admin_provider_applications`
- `public.is_admin(uid uuid)`
- `public.admin_role(uid uuid)`

Roles:

- `owner`
- `admin`
- `moderator`
- `support`

## Moderation Statuses

Listing moderation in the current DB/code uses:

- `pending_review`
- `active`
- `rejected`
- `archived`

Video moderation uses:

- `pending_review`
- `approved`
- `rejected`
- `manual_required`
- `archived`

Human-facing shorthand may say pending/approved/rejected/archived, but use the exact DB values in code and SQL.

Report statuses:

- `open`
- `reviewing`
- `resolved`
- `dismissed`

Service provider application statuses:

- `pending_review`
- `reviewing`
- `approved`
- `rejected`
- `archived`

Approving a service provider application does not create an active public provider. A future admin flow must create or update `service_marketplace.providers`, `branches`, and `offerings` explicitly.

## Vertical Awareness

Admin remains one shared moderation surface. WEB-12 prepares vertical labels and future filtering, but current `marketplace.listings` rows are still car-backed because `vehicle_profile_id` is mandatory.

Future verticals should add vertical-aware filters and checklist config inside the shared admin panel rather than creating separate admin panels per category.

## Admin Bootstrap

1. Login once on the website with the intended owner account.
2. Open Supabase Dashboard -> Authentication -> Users.
3. Copy that user's `auth.users.id`.
4. Run:

```sql
insert into public.admin_users (user_id, role, is_active)
values ('YOUR_AUTH_USER_ID', 'owner', true)
on conflict (user_id)
do update
set role = excluded.role,
    is_active = excluded.is_active,
    updated_at = now();
```

5. Open `/admin`.

## Security Notes

- Admin pages should never be linked as public content.
- Reports are private.
- Service provider applications are private and must not appear in public service pages or Rif context.
- Admin actions should write audit records to `public.admin_audit_logs`.
- Admin routes are excluded from sitemap and disallowed in robots.
