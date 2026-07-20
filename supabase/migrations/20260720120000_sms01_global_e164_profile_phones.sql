-- =============================================================================
-- OTOYALI - SMS-01 global E.164 profile phone compatibility
-- Migration: 20260720120000_sms01_global_e164_profile_phones.sql
-- Scope: Replace obsolete profile phone constraint with global E.164 shape.
-- =============================================================================

BEGIN;

-- Existing rows must already be canonical E.164 or NULL. Do not silently rewrite
-- user phone data; fail the migration if legacy malformed values exist.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE phone IS NOT NULL
      AND phone !~ '^\+[1-9][0-9]{1,14}$'
  ) THEN
    RAISE EXCEPTION
      'Cannot replace profiles_phone_format_chk: public.profiles contains non-E.164 phone values'
      USING ERRCODE = '23514';
  END IF;
END;
$$;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_phone_format_chk;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phone_format_chk
  CHECK (phone IS NULL OR phone ~ '^\+[1-9][0-9]{1,14}$')
  NOT VALID;

ALTER TABLE public.profiles
  VALIDATE CONSTRAINT profiles_phone_format_chk;

COMMENT ON CONSTRAINT profiles_phone_format_chk ON public.profiles IS
  'Allows NULL or canonical E.164 phone values: + followed by 2 to 15 digits, first digit 1-9. Country-specific validity remains application-level.';

COMMIT;
