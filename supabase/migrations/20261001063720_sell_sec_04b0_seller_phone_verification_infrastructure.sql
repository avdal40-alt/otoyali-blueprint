BEGIN;

CREATE TABLE identity.seller_phone_verification_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'turkey_seller_contact',
  provider TEXT NOT NULL,
  provider_reference TEXT,
  status TEXT NOT NULL DEFAULT 'reserved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  CONSTRAINT seller_phone_challenge_phone_chk CHECK (phone_e164 ~ '^[+]90[1-9][0-9]{9}$'),
  CONSTRAINT seller_phone_challenge_purpose_chk CHECK (purpose = 'turkey_seller_contact'),
  CONSTRAINT seller_phone_challenge_status_chk CHECK (status IN ('reserved', 'sent', 'failed', 'consumed')),
  CONSTRAINT seller_phone_challenge_expiry_chk CHECK (expires_at > created_at),
  CONSTRAINT seller_phone_challenge_consumed_chk CHECK ((status = 'consumed') = (consumed_at IS NOT NULL))
);
CREATE INDEX seller_phone_challenges_user_created_idx ON identity.seller_phone_verification_challenges(user_id, created_at DESC);
CREATE INDEX seller_phone_challenges_phone_created_idx ON identity.seller_phone_verification_challenges(phone_e164, created_at DESC);
COMMENT ON TABLE identity.seller_phone_verification_challenges IS 'Private seller-purpose OTP challenge metadata. OTP values and provider responses are never stored.';

CREATE FUNCTION identity.reserve_seller_phone_verification_challenge(p_user_id UUID, p_phone_e164 TEXT, p_provider TEXT)
RETURNS TABLE(challenge_id UUID, outcome TEXT, retry_after_seconds INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = identity, auth, pg_catalog AS $$
DECLARE v_latest TIMESTAMPTZ; v_id UUID;
BEGIN
  IF p_user_id IS NULL OR p_phone_e164 IS NULL OR p_phone_e164 !~ '^[+]90[1-9][0-9]{9}$' OR p_provider IS NULL OR p_provider !~ '^[a-z_]{3,40}$' THEN RAISE EXCEPTION 'invalid seller phone challenge' USING ERRCODE='22023'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(80400, pg_catalog.hashtext(p_user_id::TEXT));
  PERFORM pg_catalog.pg_advisory_xact_lock(80401, pg_catalog.hashtext(p_phone_e164));
  SELECT max(created_at) INTO v_latest FROM identity.seller_phone_verification_challenges WHERE (user_id=p_user_id OR phone_e164=p_phone_e164) AND created_at > NOW()-interval '60 seconds';
  IF v_latest IS NOT NULL THEN RETURN QUERY SELECT NULL::UUID, 'rate_limited'::TEXT, GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_latest + interval '60 seconds' - NOW())))::INTEGER); RETURN; END IF;
  IF (SELECT count(*) FROM identity.seller_phone_verification_challenges WHERE user_id=p_user_id AND created_at > NOW()-interval '1 hour') >= 3
     OR (SELECT count(*) FROM identity.seller_phone_verification_challenges WHERE phone_e164=p_phone_e164 AND created_at > NOW()-interval '1 hour') >= 5 THEN RETURN QUERY SELECT NULL::UUID, 'rate_limited'::TEXT, 60; RETURN; END IF;
  INSERT INTO identity.seller_phone_verification_challenges(user_id,phone_e164,purpose,provider,expires_at) VALUES(p_user_id,p_phone_e164,'turkey_seller_contact',p_provider,NOW()+interval '10 minutes') RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id, 'reserved'::TEXT, NULL::INTEGER;
END $$;

CREATE FUNCTION identity.mark_seller_phone_verification_challenge_sent(p_challenge_id UUID, p_provider_reference TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = identity, pg_catalog AS $$
BEGIN
  IF p_challenge_id IS NULL OR p_provider_reference IS NULL OR char_length(p_provider_reference) NOT BETWEEN 1 AND 128 THEN RAISE EXCEPTION 'invalid seller phone provider reference' USING ERRCODE='22023'; END IF;
  UPDATE identity.seller_phone_verification_challenges SET status='sent', provider_reference=p_provider_reference WHERE id=p_challenge_id AND status='reserved' AND expires_at>NOW();
  RETURN FOUND;
END $$;

CREATE FUNCTION identity.consume_seller_phone_verification_challenge(p_challenge_id UUID, p_user_id UUID)
RETURNS TABLE(phone_e164 TEXT) LANGUAGE plpgsql SECURITY DEFINER SET search_path = identity, pg_catalog AS $$
BEGIN
  IF p_challenge_id IS NULL OR p_user_id IS NULL THEN RAISE EXCEPTION 'invalid seller phone challenge' USING ERRCODE='22023'; END IF;
  RETURN QUERY UPDATE identity.seller_phone_verification_challenges SET status='consumed', consumed_at=NOW() WHERE id=p_challenge_id AND user_id=p_user_id AND purpose='turkey_seller_contact' AND status='sent' AND expires_at>NOW() RETURNING identity.seller_phone_verification_challenges.phone_e164;
END $$;

ALTER TABLE identity.seller_phone_verification_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY seller_phone_challenges_service_role_all ON identity.seller_phone_verification_challenges FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
REVOKE ALL ON TABLE identity.seller_phone_verification_challenges FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE identity.seller_phone_verification_challenges TO service_role;
REVOKE ALL ON FUNCTION identity.reserve_seller_phone_verification_challenge(UUID,TEXT,TEXT), identity.mark_seller_phone_verification_challenge_sent(UUID,TEXT), identity.consume_seller_phone_verification_challenge(UUID,UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION identity.reserve_seller_phone_verification_challenge(UUID,TEXT,TEXT), identity.mark_seller_phone_verification_challenge_sent(UUID,TEXT), identity.consume_seller_phone_verification_challenge(UUID,UUID) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
