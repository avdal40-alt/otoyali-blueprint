-- =============================================================================
-- OTOYALI - SECURITY-04A profile phone identity hardening
-- Migration: 20260826120000_security04a_profile_phone_identity_hardening.sql
-- Scope: Keep the Auth-owned phone mirror out of ordinary profile mutations.
-- =============================================================================

BEGIN;

-- Profile rows are created synchronously by identity.handle_new_user(). Browser
-- clients do not need an INSERT path, and retaining one makes upsert semantics
-- unnecessarily broad for identity-owned columns.
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;

-- A table-level UPDATE grant implies UPDATE on every column. Replace it with an
-- explicit allowlist of the fields the current profile and sell flows edit.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.profiles FROM authenticated;

REVOKE INSERT (
  id,
  phone,
  email,
  first_name,
  last_name,
  avatar_url,
  language,
  country,
  city,
  timezone,
  created_at,
  updated_at,
  onboarding_completed_at,
  full_name,
  display_name,
  seller_type
) ON public.profiles FROM authenticated;

REVOKE UPDATE (
  id,
  phone,
  email,
  first_name,
  last_name,
  avatar_url,
  language,
  country,
  city,
  timezone,
  created_at,
  updated_at,
  onboarding_completed_at,
  full_name,
  display_name,
  seller_type
) ON public.profiles FROM authenticated;

GRANT UPDATE (
  first_name,
  last_name,
  full_name,
  display_name,
  seller_type,
  language,
  country,
  city,
  timezone,
  onboarding_completed_at
) ON public.profiles TO authenticated;

COMMENT ON COLUMN public.profiles.phone IS
  'E.164 mirror of auth.users.phone. Authenticated clients cannot mutate it through ordinary profile writes.';

COMMIT;
