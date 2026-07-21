-- =============================================================================
-- OTOYALI - AUTH-03 validated signup metadata
-- Migration: 20260721130000_auth03_validated_signup_metadata.sql
-- Scope: Replace only identity.handle_new_user() to validate optional signup
--        country, language, and timezone metadata before profile bootstrap.
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
  v_profile_language TEXT;
  v_profile_country TEXT;
  v_profile_timezone TEXT;
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

  v_profile_language :=
    CASE
      WHEN (NEW.raw_user_meta_data ->> 'language') IN ('tr', 'en') THEN NEW.raw_user_meta_data ->> 'language'
      ELSE 'tr'
    END;

  v_profile_country :=
    CASE
      WHEN (NEW.raw_user_meta_data ->> 'country') ~ '^[A-Z]{2}$' THEN NEW.raw_user_meta_data ->> 'country'
      ELSE 'TR'
    END;

  v_profile_timezone :=
    CASE
      WHEN NEW.raw_user_meta_data ->> 'timezone' IS NOT NULL
           AND char_length(NEW.raw_user_meta_data ->> 'timezone') BETWEEN 1 AND 80
           AND (NEW.raw_user_meta_data ->> 'timezone') !~ '[[:cntrl:]]'
           AND EXISTS (
             SELECT 1
             FROM pg_catalog.pg_timezone_names AS timezone_name
             WHERE timezone_name.name = (NEW.raw_user_meta_data ->> 'timezone')
           )
        THEN NEW.raw_user_meta_data ->> 'timezone'
      WHEN v_profile_country = 'TR' THEN 'Europe/Istanbul'
      ELSE 'UTC'
    END;

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
    v_profile_language,
    v_profile_country,
    v_profile_timezone
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
