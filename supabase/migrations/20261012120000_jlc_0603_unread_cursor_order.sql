BEGIN;

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
    c.id,
    c.listing_id,
    c.last_message_at,
    c.last_message_id,
    (
      SELECT count(*)
      FROM messaging.messages AS message
      WHERE message.conversation_id = c.id
        AND message.sender_id <> v_user_id
        AND (
          participant.last_read_message_id IS NULL
          OR (message.created_at, message.id) > (
            SELECT read_message.created_at, read_message.id
            FROM messaging.messages AS read_message
            WHERE read_message.id = participant.last_read_message_id
          )
        )
    )
  FROM messaging.conversations AS c
  JOIN messaging.conversation_participants AS participant
    ON participant.conversation_id = c.id
   AND participant.user_id = v_user_id
  WHERE p_before_at IS NULL OR (c.last_message_at, c.id) < (p_before_at, p_before_id)
  ORDER BY c.last_message_at DESC NULLS LAST, c.id DESC
  LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.list_own_conversations(INTEGER, TIMESTAMPTZ, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_own_conversations(INTEGER, TIMESTAMPTZ, UUID) TO authenticated;

COMMENT ON FUNCTION public.list_own_conversations(INTEGER, TIMESTAMPTZ, UUID) IS
  'Participant-only inbox facade. Unread state compares the canonical message cursor so same-timestamp messages remain correctly ordered.';

NOTIFY pgrst, 'reload schema';
COMMIT;
