BEGIN;

-- JLC-0605 corrective migration: the output column name message_id shadows an
-- unqualified partial-index inference target in PL/pgSQL. A targetless
-- DO NOTHING is still idempotent for the immutable message notification and
-- avoids restoring the ambiguity.
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
  IF v_recipient_id IS NULL THEN RAISE EXCEPTION 'conversation recipient is unavailable' USING ERRCODE = 'OT403'; END IF;

  INSERT INTO marketplace.notifications (user_id, type, conversation_id, message_id)
  VALUES (v_recipient_id, 'chat_message', p_conversation_id, v_message_id)
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT v_message_id, v_created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.send_conversation_message(UUID, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.send_conversation_message(UUID, TEXT) TO authenticated;
COMMENT ON FUNCTION public.send_conversation_message(UUID, TEXT) IS
  'Participant-only immutable text message facade. It creates one private chat notification for the counterpart and never copies a message body.';

NOTIFY pgrst, 'reload schema';

COMMIT;
