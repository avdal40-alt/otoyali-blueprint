BEGIN;

CREATE SCHEMA IF NOT EXISTS messaging;
REVOKE ALL ON SCHEMA messaging FROM PUBLIC;

CREATE TABLE messaging.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace.listings(id) ON DELETE RESTRICT,
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  last_message_at TIMESTAMPTZ,
  last_message_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conversations_buyer_not_seller_chk CHECK (buyer_id <> seller_id),
  CONSTRAINT conversations_listing_buyer_key UNIQUE (listing_id, buyer_id)
);

CREATE TABLE messaging.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES messaging.conversations(id) ON DELETE RESTRICT,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT messages_body_not_blank_chk CHECK (char_length(btrim(body)) > 0),
  CONSTRAINT messages_body_length_chk CHECK (char_length(body) <= 2000)
);

ALTER TABLE messaging.conversations
  ADD CONSTRAINT conversations_last_message_fk
  FOREIGN KEY (last_message_id) REFERENCES messaging.messages(id) ON DELETE RESTRICT;

CREATE TABLE messaging.conversation_participants (
  conversation_id UUID NOT NULL REFERENCES messaging.conversations(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  participant_role TEXT NOT NULL CHECK (participant_role IN ('buyer', 'seller')),
  last_read_message_id UUID,
  last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id),
  CONSTRAINT conversation_participants_read_message_fk
    FOREIGN KEY (last_read_message_id) REFERENCES messaging.messages(id) ON DELETE RESTRICT
);

CREATE INDEX conversations_participant_inbox_idx
  ON messaging.conversations (buyer_id, last_message_at DESC NULLS LAST, id DESC);
CREATE INDEX conversations_seller_inbox_idx
  ON messaging.conversations (seller_id, last_message_at DESC NULLS LAST, id DESC);
CREATE INDEX messages_conversation_order_idx
  ON messaging.messages (conversation_id, created_at DESC, id DESC);

ALTER TABLE messaging.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversations_select_participant ON messaging.conversations
  FOR SELECT TO authenticated
  USING ((select auth.uid()) IN (buyer_id, seller_id));
CREATE POLICY messages_select_participant ON messaging.messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM messaging.conversation_participants AS cp WHERE cp.conversation_id = messages.conversation_id AND cp.user_id = (select auth.uid())));
CREATE POLICY participants_select_self ON messaging.conversation_participants
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY conversations_service_role_all ON messaging.conversations FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY messages_service_role_all ON messaging.messages FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY participants_service_role_all ON messaging.conversation_participants FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

REVOKE ALL ON ALL TABLES IN SCHEMA messaging FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA messaging FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA messaging FROM authenticated;
GRANT USAGE ON SCHEMA messaging TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA messaging TO service_role;

CREATE FUNCTION public.get_or_create_listing_conversation(p_listing_id UUID)
RETURNS TABLE (conversation_id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid(); v_seller_id UUID; v_conversation_id UUID; v_created_at TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT l.seller_id INTO v_seller_id FROM marketplace.listings AS l
  WHERE l.id = p_listing_id AND l.status = 'active' AND l.moderation_status = 'active' FOR SHARE;
  IF NOT FOUND OR v_seller_id = v_user_id THEN RETURN; END IF;
  INSERT INTO messaging.conversations (listing_id, buyer_id, seller_id)
  VALUES (p_listing_id, v_user_id, v_seller_id)
  ON CONFLICT (listing_id, buyer_id) DO UPDATE SET listing_id = EXCLUDED.listing_id
  RETURNING id, created_at INTO v_conversation_id, v_created_at;
  INSERT INTO messaging.conversation_participants (conversation_id, user_id, participant_role)
  VALUES (v_conversation_id, v_user_id, 'buyer'), (v_conversation_id, v_seller_id, 'seller')
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
  RETURN QUERY SELECT v_conversation_id, v_created_at;
END; $$;

CREATE FUNCTION public.list_own_conversations(p_limit INTEGER DEFAULT 20, p_before_at TIMESTAMPTZ DEFAULT NULL, p_before_id UUID DEFAULT NULL)
RETURNS TABLE (conversation_id UUID, listing_id UUID, last_message_at TIMESTAMPTZ, last_message_id UUID, unread_count BIGINT)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid(); v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  RETURN QUERY SELECT c.id, c.listing_id, c.last_message_at, c.last_message_id,
    (SELECT count(*) FROM messaging.messages AS m WHERE m.conversation_id = c.id AND m.sender_id <> v_user_id AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at))
  FROM messaging.conversations AS c JOIN messaging.conversation_participants AS cp ON cp.conversation_id = c.id AND cp.user_id = v_user_id
  WHERE (p_before_at IS NULL OR (c.last_message_at, c.id) < (p_before_at, p_before_id))
  ORDER BY c.last_message_at DESC NULLS LAST, c.id DESC LIMIT v_limit;
END; $$;

CREATE FUNCTION public.list_conversation_messages(p_conversation_id UUID, p_limit INTEGER DEFAULT 50, p_before_at TIMESTAMPTZ DEFAULT NULL, p_before_id UUID DEFAULT NULL)
RETURNS TABLE (message_id UUID, sender_id UUID, body TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid(); v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF NOT EXISTS (SELECT 1 FROM messaging.conversation_participants AS cp WHERE cp.conversation_id = p_conversation_id AND cp.user_id = v_user_id) THEN RAISE EXCEPTION 'conversation access denied' USING ERRCODE = 'OT403'; END IF;
  RETURN QUERY SELECT m.id, m.sender_id, m.body, m.created_at FROM messaging.messages AS m
  WHERE m.conversation_id = p_conversation_id AND (p_before_at IS NULL OR (m.created_at, m.id) < (p_before_at, p_before_id))
  ORDER BY m.created_at DESC, m.id DESC LIMIT v_limit;
END; $$;

CREATE FUNCTION public.send_conversation_message(p_conversation_id UUID, p_body TEXT)
RETURNS TABLE (message_id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid(); v_message_id UUID; v_created_at TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF p_body IS NULL OR char_length(btrim(p_body)) = 0 OR char_length(p_body) > 2000 THEN RAISE EXCEPTION 'invalid message body' USING ERRCODE = 'OT422'; END IF;
  IF NOT EXISTS (SELECT 1 FROM messaging.conversation_participants AS cp WHERE cp.conversation_id = p_conversation_id AND cp.user_id = v_user_id) THEN RAISE EXCEPTION 'conversation access denied' USING ERRCODE = 'OT403'; END IF;
  INSERT INTO messaging.messages (conversation_id, sender_id, body) VALUES (p_conversation_id, v_user_id, p_body) RETURNING id, created_at INTO v_message_id, v_created_at;
  UPDATE messaging.conversations SET last_message_at = v_created_at, last_message_id = v_message_id WHERE id = p_conversation_id;
  UPDATE messaging.conversation_participants SET last_read_message_id = v_message_id, last_read_at = v_created_at WHERE conversation_id = p_conversation_id AND user_id = v_user_id;
  RETURN QUERY SELECT v_message_id, v_created_at;
END; $$;

CREATE FUNCTION public.mark_conversation_read(p_conversation_id UUID, p_message_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid(); v_created_at TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF NOT EXISTS (SELECT 1 FROM messaging.conversation_participants AS cp WHERE cp.conversation_id = p_conversation_id AND cp.user_id = v_user_id) THEN RAISE EXCEPTION 'conversation access denied' USING ERRCODE = 'OT403'; END IF;
  SELECT m.created_at INTO v_created_at FROM messaging.messages AS m WHERE m.id = p_message_id AND m.conversation_id = p_conversation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'message not in conversation' USING ERRCODE = 'OT404'; END IF;
  UPDATE messaging.conversation_participants SET last_read_message_id = p_message_id, last_read_at = v_created_at WHERE conversation_id = p_conversation_id AND user_id = v_user_id AND (last_read_at IS NULL OR last_read_at <= v_created_at);
END; $$;

REVOKE ALL ON FUNCTION public.get_or_create_listing_conversation(UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.list_own_conversations(INTEGER, TIMESTAMPTZ, UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.list_conversation_messages(UUID, INTEGER, TIMESTAMPTZ, UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.send_conversation_message(UUID, TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.mark_conversation_read(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_or_create_listing_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_own_conversations(INTEGER, TIMESTAMPTZ, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_conversation_messages(UUID, INTEGER, TIMESTAMPTZ, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_conversation_message(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID, UUID) TO authenticated;

COMMENT ON TABLE messaging.conversations IS 'Private canonical buyer/listing/seller conversation context; seller and buyer are derived only by database operation.';
COMMENT ON TABLE messaging.messages IS 'Private immutable plain-text messages. Bodies are intentionally excluded from audit and analytics contracts.';
COMMENT ON FUNCTION public.get_or_create_listing_conversation(UUID) IS 'Authenticated eligible-listing conversation facade. Seller and buyer identities are derived server-side.';
COMMENT ON FUNCTION public.send_conversation_message(UUID, TEXT) IS 'Participant-only immutable text message facade; body is capped at 2000 Unicode characters and is not audited.';
NOTIFY pgrst, 'reload schema';
COMMIT;
