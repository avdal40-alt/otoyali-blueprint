BEGIN;
CREATE OR REPLACE FUNCTION public.get_or_create_listing_conversation(p_listing_id UUID)
RETURNS TABLE (conversation_id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid(); v_seller_id UUID; v_conversation_id UUID; v_created_at TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT l.seller_id INTO v_seller_id FROM marketplace.listings AS l WHERE l.id = p_listing_id AND l.status = 'active' AND l.moderation_status = 'active' FOR SHARE;
  IF NOT FOUND OR v_seller_id = v_user_id THEN RETURN; END IF;
  INSERT INTO messaging.conversations (listing_id, buyer_id, seller_id) VALUES (p_listing_id, v_user_id, v_seller_id) ON CONFLICT (listing_id, buyer_id) DO UPDATE SET listing_id = EXCLUDED.listing_id RETURNING messaging.conversations.id, messaging.conversations.created_at INTO v_conversation_id, v_created_at;
  INSERT INTO messaging.conversation_participants (conversation_id, user_id, participant_role) VALUES (v_conversation_id, v_user_id, 'buyer'), (v_conversation_id, v_seller_id, 'seller') ON CONFLICT ON CONSTRAINT conversation_participants_pkey DO NOTHING;
  RETURN QUERY SELECT v_conversation_id, v_created_at;
END; $$;
REVOKE ALL ON FUNCTION public.get_or_create_listing_conversation(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_or_create_listing_conversation(UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
