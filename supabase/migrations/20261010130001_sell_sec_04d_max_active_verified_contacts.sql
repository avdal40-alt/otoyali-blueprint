BEGIN;

CREATE OR REPLACE FUNCTION identity.reserve_seller_phone_verification_challenge(
  p_user_id UUID, p_phone_e164 TEXT, p_provider TEXT
)
RETURNS TABLE(challenge_id UUID, outcome TEXT, retry_after_seconds INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = identity, auth, pg_catalog AS $$
DECLARE
  v_latest TIMESTAMPTZ;
  v_id UUID;
BEGIN
  IF p_user_id IS NULL OR p_phone_e164 IS NULL OR p_phone_e164 !~ '^[+]90[1-9][0-9]{9}$'
     OR p_provider IS NULL OR p_provider !~ '^[a-z_]{3,40}$' THEN
    RAISE EXCEPTION 'invalid seller phone challenge' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(80400, pg_catalog.hashtext(p_user_id::TEXT));
  PERFORM pg_catalog.pg_advisory_xact_lock(80401, pg_catalog.hashtext(p_phone_e164));

  IF (SELECT count(*) FROM identity.verified_seller_contact_phones
      WHERE user_id = p_user_id AND is_active) >= 3
     AND NOT EXISTS (
       SELECT 1 FROM identity.verified_seller_contact_phones
       WHERE user_id = p_user_id AND phone_e164 = p_phone_e164 AND is_active
     ) THEN
    RETURN QUERY SELECT NULL::UUID, 'active_contact_limit'::TEXT, NULL::INTEGER;
    RETURN;
  END IF;

  SELECT max(created_at) INTO v_latest
  FROM identity.seller_phone_verification_challenges
  WHERE (user_id = p_user_id OR phone_e164 = p_phone_e164)
    AND created_at > NOW() - interval '60 seconds';
  IF v_latest IS NOT NULL THEN
    RETURN QUERY SELECT NULL::UUID, 'rate_limited'::TEXT,
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_latest + interval '60 seconds' - NOW())))::INTEGER);
    RETURN;
  END IF;
  IF (SELECT count(*) FROM identity.seller_phone_verification_challenges WHERE user_id = p_user_id AND created_at > NOW()-interval '1 hour') >= 3
     OR (SELECT count(*) FROM identity.seller_phone_verification_challenges WHERE phone_e164 = p_phone_e164 AND created_at > NOW()-interval '1 hour') >= 5 THEN
    RETURN QUERY SELECT NULL::UUID, 'rate_limited'::TEXT, 60;
    RETURN;
  END IF;

  INSERT INTO identity.seller_phone_verification_challenges(user_id, phone_e164, purpose, provider, expires_at)
  VALUES (p_user_id, p_phone_e164, 'turkey_seller_contact', p_provider, NOW() + interval '10 minutes')
  RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id, 'reserved'::TEXT, NULL::INTEGER;
END;
$$;

COMMIT;
