BEGIN;

-- JLC-0605: a chat event is private to the receiving conversation participant.
-- The notification stores identifiers only; message bodies and participant identities
-- remain available solely through the established participant-only conversation RPCs.
ALTER TABLE marketplace.notifications
  ADD COLUMN conversation_id UUID REFERENCES messaging.conversations(id) ON DELETE RESTRICT,
  ADD COLUMN message_id UUID REFERENCES messaging.messages(id) ON DELETE RESTRICT;

ALTER TABLE marketplace.notifications
  ADD CONSTRAINT notifications_chat_message_refs_chk
  CHECK (
    type <> 'chat_message'
    OR (conversation_id IS NOT NULL AND message_id IS NOT NULL)
  );

CREATE UNIQUE INDEX notifications_chat_message_dedup_idx
  ON marketplace.notifications (message_id, type)
  WHERE type = 'chat_message' AND message_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.send_conversation_message(p_conversation_id UUID, p_body TEXT)
RETURNS TABLE (message_id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_message_id UUID;
  v_created_at TIMESTAMPTZ;
  v_recipient_id UUID;
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

  INSERT INTO messaging.messages (conversation_id, sender_id, body)
  VALUES (p_conversation_id, v_user_id, p_body)
  RETURNING messaging.messages.id, messaging.messages.created_at INTO v_message_id, v_created_at;

  UPDATE messaging.conversations
  SET last_message_at = v_created_at, last_message_id = v_message_id
  WHERE id = p_conversation_id;
  UPDATE messaging.conversation_participants
  SET last_read_message_id = v_message_id, last_read_at = v_created_at
  WHERE conversation_id = p_conversation_id AND user_id = v_user_id;

  SELECT participant.user_id INTO v_recipient_id
  FROM messaging.conversation_participants AS participant
  WHERE participant.conversation_id = p_conversation_id AND participant.user_id <> v_user_id;

  IF v_recipient_id IS NULL THEN
    RAISE EXCEPTION 'conversation recipient is unavailable' USING ERRCODE = 'OT403';
  END IF;

  INSERT INTO marketplace.notifications (user_id, type, conversation_id, message_id)
  VALUES (v_recipient_id, 'chat_message', p_conversation_id, v_message_id)
  ON CONFLICT (message_id, type)
    WHERE type = 'chat_message' AND message_id IS NOT NULL
  DO NOTHING;

  RETURN QUERY SELECT v_message_id, v_created_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id UUID, p_message_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid(); v_created_at TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF NOT EXISTS (SELECT 1 FROM messaging.conversation_participants AS cp WHERE cp.conversation_id = p_conversation_id AND cp.user_id = v_user_id) THEN RAISE EXCEPTION 'conversation access denied' USING ERRCODE = 'OT403'; END IF;
  SELECT m.created_at INTO v_created_at FROM messaging.messages AS m WHERE m.id = p_message_id AND m.conversation_id = p_conversation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'message not in conversation' USING ERRCODE = 'OT404'; END IF;
  UPDATE messaging.conversation_participants
  SET last_read_message_id = p_message_id, last_read_at = v_created_at
  WHERE conversation_id = p_conversation_id AND user_id = v_user_id
    AND (last_read_at IS NULL OR last_read_at <= v_created_at);

  UPDATE marketplace.notifications AS notification
  SET read_at = COALESCE(notification.read_at, now())
  FROM messaging.messages AS message
  WHERE notification.user_id = v_user_id
    AND notification.type = 'chat_message'
    AND notification.conversation_id = p_conversation_id
    AND notification.message_id = message.id
    AND message.created_at <= v_created_at;
END;
$$;

CREATE FUNCTION marketplace.list_own_notifications_v2(
  p_limit INTEGER DEFAULT 20,
  p_before_created_at TIMESTAMPTZ DEFAULT NULL,
  p_before_id UUID DEFAULT NULL
)
RETURNS TABLE (
  notification_id UUID,
  notification_type TEXT,
  saved_search_id UUID,
  listing_id UUID,
  conversation_id UUID,
  message_id UUID,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication is required' USING ERRCODE = 'OT401'; END IF;
  IF p_limit NOT BETWEEN 1 AND 50 OR (p_before_created_at IS NULL) <> (p_before_id IS NULL) THEN
    RAISE EXCEPTION 'notification cursor is invalid' USING ERRCODE = 'OT422';
  END IF;
  RETURN QUERY
  SELECT notification.id, notification.type, notification.saved_search_id,
    notification.listing_id, notification.conversation_id, notification.message_id,
    notification.created_at, notification.read_at
  FROM marketplace.notifications AS notification
  WHERE notification.user_id = v_user_id
    AND (p_before_id IS NULL OR (notification.created_at, notification.id) < (p_before_created_at, p_before_id))
  ORDER BY notification.created_at DESC, notification.id DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.send_conversation_message(UUID, TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.mark_conversation_read(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.list_own_notifications_v2(INTEGER, TIMESTAMPTZ, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.send_conversation_message(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION marketplace.list_own_notifications_v2(INTEGER, TIMESTAMPTZ, UUID) TO authenticated, service_role;

COMMENT ON TABLE marketplace.notifications IS
  'Private owner-scoped in-app notification records. Chat events store only conversation and message identifiers; message contents remain in the participant-only messaging boundary.';
COMMENT ON FUNCTION public.send_conversation_message(UUID, TEXT) IS
  'Participant-only immutable text message facade. It creates one private chat notification for the counterpart and never copies a message body.';
COMMENT ON FUNCTION public.mark_conversation_read(UUID, UUID) IS
  'Participant-only read cursor facade. Reading a message also marks this participant''s prior chat notifications for the same conversation as read.';
COMMENT ON FUNCTION marketplace.list_own_notifications_v2(INTEGER, TIMESTAMPTZ, UUID) IS
  'Owner-derived bounded notification history facade. Chat events expose identifiers only for participant-authorized navigation.';

NOTIFY pgrst, 'reload schema';

COMMIT;
