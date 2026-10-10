BEGIN;

CREATE TABLE messaging.conversation_listing_responses (
  conversation_id UUID NOT NULL REFERENCES messaging.conversations(id) ON DELETE RESTRICT,
  listing_id UUID NOT NULL REFERENCES marketplace.listings(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, listing_id)
);

ALTER TABLE messaging.conversation_listing_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY conversation_listing_responses_participant_select ON messaging.conversation_listing_responses
  FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM messaging.conversations c WHERE c.id = conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())));
REVOKE ALL ON messaging.conversation_listing_responses FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA messaging TO authenticated;

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
  RETURN QUERY INSERT INTO messaging.conversation_listing_responses (conversation_id, listing_id, seller_id)
    VALUES (p_conversation_id, p_listing_id, v_seller_id)
    ON CONFLICT (conversation_id, listing_id) DO UPDATE SET listing_id = EXCLUDED.listing_id
    RETURNING conversation_listing_responses.conversation_id, conversation_listing_responses.listing_id, conversation_listing_responses.created_at;
END; $$;

REVOKE ALL ON FUNCTION public.attach_own_active_listing_response(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.attach_own_active_listing_response(UUID, UUID) TO authenticated;
COMMENT ON FUNCTION public.attach_own_active_listing_response(UUID, UUID) IS 'Seller-only response attachment. The database verifies ownership and active moderation state.';

CREATE FUNCTION public.list_conversation_listing_responses(p_conversation_id UUID)
RETURNS TABLE (listing_id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM messaging.conversations c WHERE c.id = p_conversation_id AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid())) THEN RAISE EXCEPTION 'conversation access denied' USING ERRCODE = 'OT403'; END IF;
  RETURN QUERY SELECT r.listing_id, r.created_at FROM messaging.conversation_listing_responses r WHERE r.conversation_id = p_conversation_id ORDER BY r.created_at DESC;
END; $$;
REVOKE ALL ON FUNCTION public.list_conversation_listing_responses(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_conversation_listing_responses(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
