BEGIN;

CREATE FUNCTION public.get_conversation_send_state(p_conversation_id UUID)
RETURNS TABLE (is_blocked BOOLEAN)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM messaging.conversation_participants AS participant
    WHERE participant.conversation_id = p_conversation_id AND participant.user_id = v_user_id
  ) THEN RAISE EXCEPTION 'conversation access denied' USING ERRCODE = 'OT403'; END IF;
  RETURN QUERY SELECT EXISTS (
    SELECT 1 FROM messaging.conversation_blocks AS block
    WHERE block.conversation_id = p_conversation_id AND block.unblocked_at IS NULL
  );
END; $$;

REVOKE ALL ON FUNCTION public.get_conversation_send_state(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_conversation_send_state(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_conversation_send_state(UUID) IS 'Participant-only boolean send availability facade; it reveals no blocker identity or report data.';
NOTIFY pgrst, 'reload schema';
COMMIT;
