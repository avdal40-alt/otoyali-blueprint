-- =============================================================================
-- OTOYALI - SMS-01 auth phone normalization for profile bootstrap
-- Migration: 20260721120000_sms01_normalize_auth_phones_for_profiles.sql
-- Scope: Replace only identity.handle_new_user() to normalize Supabase Auth
--        digits-only phones before inserting public.profiles.phone.
-- =============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION identity.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = identity, public, auth
AS $$
DECLARE
  v_role_id UUID;
  v_profile_phone TEXT;
BEGIN
  v_profile_phone :=
    CASE
      WHEN NEW.phone IS NULL THEN NULL
      WHEN NEW.phone = '' THEN NULL
      WHEN NEW.phone ~ '^\+[1-9][0-9]{1,14}$' THEN NEW.phone
      WHEN NEW.phone ~ '^[1-9][0-9]{1,14}$' THEN '+' || NEW.phone
      ELSE NEW.phone
    END;

  IF v_profile_phone IS NOT NULL
     AND v_profile_phone !~ '^\+[1-9][0-9]{1,14}$' THEN
    RAISE EXCEPTION 'invalid profile phone format'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.profiles (
    id,
    phone,
    email,
    language,
    country,
    timezone
  )
  VALUES (
    NEW.id,
    v_profile_phone,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'language', 'tr'),
    COALESCE(NEW.raw_user_meta_data ->> 'country', 'TR'),
    COALESCE(NEW.raw_user_meta_data ->> 'timezone', 'Europe/Istanbul')
  );

  INSERT INTO identity.user_settings (user_id)
  VALUES (NEW.id);

  INSERT INTO identity.notification_preferences (user_id)
  VALUES (NEW.id);

  SELECT id
  INTO v_role_id
  FROM identity.roles
  WHERE slug = 'individual'
  LIMIT 1;

  IF v_role_id IS NOT NULL THEN
    INSERT INTO identity.user_roles (user_id, role_id)
    VALUES (NEW.id, v_role_id);
  END IF;

  PERFORM identity.write_audit_log(
    p_action        => 'profile.create',
    p_resource_type => 'profile',
    p_resource_id   => NEW.id,
    p_new_values    => jsonb_build_object(
      'phone_present', v_profile_phone IS NOT NULL,
      'email_present', NEW.email IS NOT NULL AND NEW.email <> '',
      'signup_method',
        CASE
          WHEN v_profile_phone IS NOT NULL THEN 'phone'
          WHEN NEW.email IS NOT NULL AND NEW.email <> '' THEN 'email'
          ELSE 'unknown'
        END
    )
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION identity.handle_new_user() IS
  'Creates profile, default settings, notification preferences, and base role when auth.users row is inserted.';

COMMIT;
