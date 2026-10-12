BEGIN;

-- UUIDs are not chronological. A database-generated sequence gives the private
-- read cursor a stable order when messages share the transaction timestamp.
ALTER TABLE messaging.messages
  ADD COLUMN message_sequence BIGINT GENERATED ALWAYS AS IDENTITY;

CREATE INDEX messages_conversation_sequence_idx
  ON messaging.messages (conversation_id, message_sequence);

CREATE OR REPLACE FUNCTION public.list_own_conversations(
  p_limit INTEGER DEFAULT 20,
  p_before_at TIMESTAMPTZ DEFAULT NULL,
  p_before_id UUID DEFAULT NULL
)
RETURNS TABLE (
  conversation_id UUID,
  listing_id UUID,
  last_message_at TIMESTAMPTZ,
  last_message_id UUID,
  unread_count BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  RETURN QUERY
  SELECT
    conversation.id,
    conversation.listing_id,
    conversation.last_message_at,
    conversation.last_message_id,
    (
      SELECT count(*)
      FROM messaging.messages AS message
      WHERE message.conversation_id = conversation.id
        AND message.sender_id <> v_user_id
        AND (
          participant.last_read_message_id IS NULL
          OR message.message_sequence > (
            SELECT read_message.message_sequence
            FROM messaging.messages AS read_message
            WHERE read_message.id = participant.last_read_message_id
          )
        )
    )
  FROM messaging.conversations AS conversation
  JOIN messaging.conversation_participants AS participant
    ON participant.conversation_id = conversation.id
   AND participant.user_id = v_user_id
  WHERE p_before_at IS NULL OR (conversation.last_message_at, conversation.id) < (p_before_at, p_before_id)
  ORDER BY conversation.last_message_at DESC NULLS LAST, conversation.id DESC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.list_own_conversations(INTEGER, TIMESTAMPTZ, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_own_conversations(INTEGER, TIMESTAMPTZ, UUID) TO authenticated;

COMMENT ON COLUMN messaging.messages.message_sequence IS
  'Monotonic private-message order used only to evaluate participant read cursors when timestamps tie.';
COMMENT ON FUNCTION public.list_own_conversations(INTEGER, TIMESTAMPTZ, UUID) IS
  'Participant-only inbox facade. Unread state compares the canonical monotonic message cursor, including same-timestamp messages.';

NOTIFY pgrst, 'reload schema';
COMMIT;
