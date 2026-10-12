BEGIN;

-- The original JLC-0802 function's unqualified conflict target collides with
-- its RETURNS TABLE output variable names in PL/pgSQL. Target the stable
-- primary-key constraint instead so an eligible seller response is retry-safe.
CREATE OR REPLACE FUNCTION public.attach_own_active_listing_response(p_conversation_id UUID, p_listing_id UUID)
RETURNS TABLE (conversation_id UUID, listing_id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid(); v_seller_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF NOT EXISTS (SELECT 1 FROM messaging.conversations c WHERE c.id = p_conversation_id AND c.seller_id = v_user_id) THEN
    RAISE EXCEPTION 'seller response access denied' USING ERRCODE = 'OT403';
  END IF;
  SELECT l.seller_id INTO v_seller_id FROM marketplace.listings l
  WHERE l.id = p_listing_id AND l.seller_id = v_user_id AND l.status = 'active' AND l.moderation_status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'listing is not eligible' USING ERRCODE = 'OT422'; END IF;

  RETURN QUERY
  INSERT INTO messaging.conversation_listing_responses AS response (conversation_id, listing_id, seller_id)
    VALUES (p_conversation_id, p_listing_id, v_seller_id)
    ON CONFLICT ON CONSTRAINT conversation_listing_responses_pkey
    DO UPDATE SET seller_id = response.seller_id
    RETURNING response.conversation_id, response.listing_id, response.created_at;
END; $$;

REVOKE ALL ON FUNCTION public.attach_own_active_listing_response(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.attach_own_active_listing_response(UUID, UUID) TO authenticated;
COMMENT ON FUNCTION public.attach_own_active_listing_response(UUID, UUID) IS 'Seller-only response attachment. The database verifies ownership and active moderation state; retrying the same response is idempotent.';

NOTIFY pgrst, 'reload schema';
COMMIT;
