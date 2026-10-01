BEGIN;
CREATE FUNCTION public.reserve_seller_phone_verification_challenge_service(p_user_id UUID,p_phone_e164 TEXT)
RETURNS TABLE(challenge_id UUID,outcome TEXT,retry_after_seconds INTEGER) LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$ SELECT * FROM identity.reserve_seller_phone_verification_challenge(p_user_id,p_phone_e164,'twilio_verify'); $$;
CREATE FUNCTION public.mark_seller_phone_verification_challenge_sent_service(p_challenge_id UUID,p_provider_reference TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$ SELECT identity.mark_seller_phone_verification_challenge_sent(p_challenge_id,p_provider_reference); $$;
CREATE FUNCTION public.get_seller_phone_verification_challenge_service(p_user_id UUID,p_challenge_id UUID)
RETURNS TABLE(challenge_id UUID,phone_e164 TEXT,purpose TEXT,provider TEXT,provider_reference TEXT,status TEXT,expires_at TIMESTAMPTZ) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$ SELECT c.id,c.phone_e164,c.purpose,c.provider,c.provider_reference,c.status,c.expires_at FROM identity.seller_phone_verification_challenges c WHERE c.id=p_challenge_id AND c.user_id=p_user_id; $$;
CREATE FUNCTION public.consume_seller_phone_verification_challenge_service(p_user_id UUID,p_challenge_id UUID)
RETURNS TABLE(phone_e164 TEXT) LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog AS $$ SELECT * FROM identity.consume_seller_phone_verification_challenge(p_challenge_id,p_user_id); $$;
REVOKE ALL ON FUNCTION public.reserve_seller_phone_verification_challenge_service(UUID,TEXT),public.mark_seller_phone_verification_challenge_sent_service(UUID,TEXT),public.get_seller_phone_verification_challenge_service(UUID,UUID),public.consume_seller_phone_verification_challenge_service(UUID,UUID) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.reserve_seller_phone_verification_challenge_service(UUID,TEXT),public.mark_seller_phone_verification_challenge_sent_service(UUID,TEXT),public.get_seller_phone_verification_challenge_service(UUID,UUID),public.consume_seller_phone_verification_challenge_service(UUID,UUID) TO service_role;
NOTIFY pgrst,'reload schema'; COMMIT;
