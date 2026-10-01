BEGIN;

-- Finalization deliberately derives the phone only from the locked, sent
-- challenge.  The verification record and consumed state commit atomically.
CREATE FUNCTION identity.finalize_seller_phone_verification(
  p_user_id UUID,
  p_challenge_id UUID
)
RETURNS TABLE(phone_e164 TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = identity, auth, pg_catalog
AS $$
DECLARE
  v_phone_e164 TEXT;
BEGIN
  IF p_user_id IS NULL OR p_challenge_id IS NULL THEN
    RAISE EXCEPTION 'invalid seller phone challenge' USING ERRCODE = '22023';
  END IF;

  SELECT challenge.phone_e164
    INTO v_phone_e164
    FROM identity.seller_phone_verification_challenges AS challenge
   WHERE challenge.id = p_challenge_id
     AND challenge.user_id = p_user_id
     AND challenge.purpose = 'turkey_seller_contact'
     AND challenge.status = 'sent'
     AND challenge.expires_at > NOW()
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- The same immutable constraint enforced by both the challenge and the
  -- authoritative table is repeated here as a defensive final boundary.
  IF v_phone_e164 !~ '^[+]90[1-9][0-9]{9}$' THEN
    RAISE EXCEPTION 'invalid verified Turkey seller phone' USING ERRCODE = '22023';
  END IF;

  INSERT INTO identity.seller_phone_verifications (user_id, phone_e164, verified_at)
  VALUES (p_user_id, v_phone_e164, NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET phone_e164 = EXCLUDED.phone_e164,
        verified_at = EXCLUDED.verified_at;

  UPDATE identity.seller_phone_verification_challenges
     SET status = 'consumed', consumed_at = NOW()
   WHERE id = p_challenge_id;

  RETURN QUERY SELECT v_phone_e164;
END;
$$;

CREATE FUNCTION public.finalize_seller_phone_verification_service(
  p_user_id UUID,
  p_challenge_id UUID
)
RETURNS TABLE(phone_e164 TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT * FROM identity.finalize_seller_phone_verification(p_user_id, p_challenge_id);
$$;

COMMENT ON FUNCTION identity.finalize_seller_phone_verification(UUID, UUID) IS
  'Trusted atomic seller OTP finalizer. Locks an owned sent challenge, records its phone, and consumes it in one transaction.';
COMMENT ON FUNCTION public.finalize_seller_phone_verification_service(UUID, UUID) IS
  'Data API bridge for the server-only service client. Browser roles have no execute privilege.';

REVOKE ALL ON FUNCTION identity.finalize_seller_phone_verification(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION identity.finalize_seller_phone_verification(UUID, UUID) TO service_role;
REVOKE ALL ON FUNCTION public.finalize_seller_phone_verification_service(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_seller_phone_verification_service(UUID, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
