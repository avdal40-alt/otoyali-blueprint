BEGIN;

CREATE FUNCTION public.complete_own_password_enrollment(p_enrollment_method TEXT)
RETURNS TABLE(password_enrolled BOOLEAN, password_enrolled_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF p_enrollment_method NOT IN ('registration', 'legacy_enrollment', 'recovery_reset') THEN
    RAISE EXCEPTION 'invalid enrollment method' USING ERRCODE = 'OT422';
  END IF;

  INSERT INTO identity.auth_password_enrollments (user_id, password_enrolled_at, enrollment_method)
  VALUES (v_user_id, NOW(), p_enrollment_method)
  ON CONFLICT (user_id) DO UPDATE
    SET password_enrolled_at = EXCLUDED.password_enrolled_at,
        enrollment_method = EXCLUDED.enrollment_method,
        updated_at = NOW();

  RETURN QUERY SELECT TRUE, (SELECT enrollment.password_enrolled_at
    FROM identity.auth_password_enrollments AS enrollment WHERE enrollment.user_id = v_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.complete_own_password_enrollment(TEXT) FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_own_password_enrollment(TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
