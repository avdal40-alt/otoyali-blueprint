BEGIN;

CREATE TABLE messaging.conversation_blocks (
  conversation_id UUID NOT NULL REFERENCES messaging.conversations(id) ON DELETE RESTRICT,
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  blocked_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unblocked_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, blocker_id),
  CONSTRAINT conversation_blocks_distinct_users_chk CHECK (blocker_id <> blocked_user_id)
);

CREATE TABLE messaging.conversation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES messaging.conversations(id) ON DELETE RESTRICT,
  message_id UUID REFERENCES messaging.messages(id) ON DELETE RESTRICT,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT conversation_reports_reason_chk
    CHECK (reason IN ('fraud', 'wrong_information', 'duplicate', 'inappropriate_content', 'suspicious_seller', 'other')),
  CONSTRAINT conversation_reports_status_chk
    CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed'))
);

CREATE INDEX conversation_blocks_blocked_user_idx
  ON messaging.conversation_blocks (blocked_user_id, conversation_id);
CREATE INDEX conversation_reports_moderation_queue_idx
  ON messaging.conversation_reports (status, created_at DESC);
CREATE INDEX conversation_reports_conversation_idx
  ON messaging.conversation_reports (conversation_id, created_at DESC);
CREATE INDEX conversation_reports_message_idx
  ON messaging.conversation_reports (message_id, created_at DESC)
  WHERE message_id IS NOT NULL;

CREATE FUNCTION messaging.validate_conversation_block()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM messaging.conversation_participants AS blocker
    JOIN messaging.conversation_participants AS blocked
      ON blocked.conversation_id = blocker.conversation_id
    WHERE blocker.conversation_id = NEW.conversation_id
      AND blocker.user_id = NEW.blocker_id
      AND blocked.user_id = NEW.blocked_user_id
  ) THEN
    RAISE EXCEPTION 'block participants are invalid' USING ERRCODE = 'OT403';
  END IF;
  RETURN NEW;
END; $$;

CREATE FUNCTION messaging.validate_conversation_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM messaging.conversation_participants AS participant
    WHERE participant.conversation_id = NEW.conversation_id
      AND participant.user_id = NEW.reporter_id
  ) THEN
    RAISE EXCEPTION 'reporter is not a conversation participant' USING ERRCODE = 'OT403';
  END IF;
  IF NEW.message_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM messaging.messages AS message
    WHERE message.id = NEW.message_id
      AND message.conversation_id = NEW.conversation_id
  ) THEN
    RAISE EXCEPTION 'message is not in conversation' USING ERRCODE = 'OT404';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER conversation_blocks_validate_participants
  BEFORE INSERT OR UPDATE ON messaging.conversation_blocks
  FOR EACH ROW EXECUTE FUNCTION messaging.validate_conversation_block();
CREATE TRIGGER conversation_reports_validate_target
  BEFORE INSERT OR UPDATE ON messaging.conversation_reports
  FOR EACH ROW EXECUTE FUNCTION messaging.validate_conversation_report();

ALTER TABLE messaging.conversation_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE messaging.conversation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY conversation_blocks_service_role_all ON messaging.conversation_blocks
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY conversation_reports_service_role_all ON messaging.conversation_reports
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

REVOKE ALL ON TABLE messaging.conversation_blocks FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE messaging.conversation_reports FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE messaging.conversation_blocks TO service_role;
GRANT ALL ON TABLE messaging.conversation_reports TO service_role;

CREATE OR REPLACE FUNCTION public.send_conversation_message(p_conversation_id UUID, p_body TEXT)
RETURNS TABLE (message_id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid(); v_message_id UUID; v_created_at TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF p_body IS NULL OR char_length(btrim(p_body)) = 0 OR char_length(p_body) > 2000 THEN RAISE EXCEPTION 'invalid message body' USING ERRCODE = 'OT422'; END IF;
  IF NOT EXISTS (SELECT 1 FROM messaging.conversation_participants AS cp WHERE cp.conversation_id = p_conversation_id AND cp.user_id = v_user_id) THEN RAISE EXCEPTION 'conversation access denied' USING ERRCODE = 'OT403'; END IF;
  IF EXISTS (
    SELECT 1 FROM messaging.conversation_blocks AS block
    WHERE block.conversation_id = p_conversation_id
      AND (block.blocker_id = v_user_id OR block.blocked_user_id = v_user_id)
      AND block.unblocked_at IS NULL
  ) THEN RAISE EXCEPTION 'message sending denied' USING ERRCODE = 'OT403'; END IF;
  INSERT INTO messaging.messages (conversation_id, sender_id, body) VALUES (p_conversation_id, v_user_id, p_body) RETURNING messaging.messages.id, messaging.messages.created_at INTO v_message_id, v_created_at;
  UPDATE messaging.conversations SET last_message_at = v_created_at, last_message_id = v_message_id WHERE id = p_conversation_id;
  UPDATE messaging.conversation_participants SET last_read_message_id = v_message_id, last_read_at = v_created_at WHERE conversation_id = p_conversation_id AND user_id = v_user_id;
  RETURN QUERY SELECT v_message_id, v_created_at;
END; $$;

CREATE FUNCTION public.block_conversation_participant(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid(); v_buyer_id UUID; v_seller_id UUID; v_blocked_user_id UUID;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT buyer_id, seller_id INTO v_buyer_id, v_seller_id FROM messaging.conversations WHERE id = p_conversation_id FOR KEY SHARE;
  IF NOT FOUND OR v_user_id NOT IN (v_buyer_id, v_seller_id) THEN RAISE EXCEPTION 'conversation access denied' USING ERRCODE = 'OT403'; END IF;
  v_blocked_user_id := CASE WHEN v_user_id = v_buyer_id THEN v_seller_id ELSE v_buyer_id END;
  INSERT INTO messaging.conversation_blocks (conversation_id, blocker_id, blocked_user_id)
  VALUES (p_conversation_id, v_user_id, v_blocked_user_id)
  ON CONFLICT (conversation_id, blocker_id) DO UPDATE SET unblocked_at = NULL;
END; $$;

CREATE FUNCTION public.unblock_conversation_participant(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF NOT EXISTS (SELECT 1 FROM messaging.conversation_participants AS cp WHERE cp.conversation_id = p_conversation_id AND cp.user_id = v_user_id) THEN RAISE EXCEPTION 'conversation access denied' USING ERRCODE = 'OT403'; END IF;
  UPDATE messaging.conversation_blocks
  SET unblocked_at = now()
  WHERE conversation_id = p_conversation_id
    AND blocker_id = v_user_id
    AND unblocked_at IS NULL;
END; $$;

CREATE FUNCTION public.report_conversation(p_conversation_id UUID, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF p_reason IS NULL OR p_reason NOT IN ('fraud', 'wrong_information', 'duplicate', 'inappropriate_content', 'suspicious_seller', 'other') THEN RAISE EXCEPTION 'invalid report reason' USING ERRCODE = 'OT422'; END IF;
  INSERT INTO messaging.conversation_reports (conversation_id, reporter_id, reason) VALUES (p_conversation_id, v_user_id, p_reason);
END; $$;

CREATE FUNCTION public.report_conversation_message(p_conversation_id UUID, p_message_id UUID, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF p_reason IS NULL OR p_reason NOT IN ('fraud', 'wrong_information', 'duplicate', 'inappropriate_content', 'suspicious_seller', 'other') THEN RAISE EXCEPTION 'invalid report reason' USING ERRCODE = 'OT422'; END IF;
  INSERT INTO messaging.conversation_reports (conversation_id, message_id, reporter_id, reason) VALUES (p_conversation_id, p_message_id, v_user_id, p_reason);
END; $$;

REVOKE ALL ON FUNCTION messaging.validate_conversation_block() FROM PUBLIC;
REVOKE ALL ON FUNCTION messaging.validate_conversation_report() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.send_conversation_message(UUID, TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.block_conversation_participant(UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.unblock_conversation_participant(UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.report_conversation(UUID, TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.report_conversation_message(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.send_conversation_message(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.block_conversation_participant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unblock_conversation_participant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_conversation(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_conversation_message(UUID, UUID, TEXT) TO authenticated;

COMMENT ON TABLE messaging.conversation_blocks IS 'Private conversation-bound directional blocks with durable unblock state; an active block prevents either participant from sending.';
COMMENT ON TABLE messaging.conversation_reports IS 'Private moderation handoff for conversation and message reports. It stores identifiers and reason only, never message bodies.';
COMMENT ON FUNCTION public.block_conversation_participant(UUID) IS 'Authenticated participant-only block facade. The counterpart is derived from the canonical conversation.';
COMMENT ON FUNCTION public.report_conversation(UUID, TEXT) IS 'Authenticated participant-only conversation report facade. Reporter identity is derived from auth and remains private.';
COMMENT ON FUNCTION public.report_conversation_message(UUID, UUID, TEXT) IS 'Authenticated participant-only message report facade. The report stores no message body.';

NOTIFY pgrst, 'reload schema';
COMMIT;
