BEGIN;

-- Keep the original JLC-0914 migration forward-only: qualify the table
-- timestamp because RETURNS TABLE creates an output variable named created_at.
CREATE OR REPLACE FUNCTION marketplace.post_dealer_live_comment(p_stream_id UUID, p_body TEXT)
RETURNS TABLE (comment_id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_body TEXT := btrim(COALESCE(p_body, ''));
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF char_length(v_body) NOT BETWEEN 1 AND 500 THEN RAISE EXCEPTION 'invalid live comment' USING ERRCODE = 'OT422'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM marketplace.dealer_live_streams stream
    WHERE stream.id = p_stream_id AND stream.status = 'live' AND public.is_verified_dealer(stream.dealer_id)
  ) THEN RAISE EXCEPTION 'commentable live stream required' USING ERRCODE = 'OT404'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_actor::text, 914));
  IF (SELECT count(*) FROM marketplace.dealer_live_comments comment
      WHERE comment.author_id = v_actor AND comment.created_at >= now() - interval '1 minute') >= 10 THEN
    RAISE EXCEPTION 'live comment rate limit exceeded' USING ERRCODE = 'OT429';
  END IF;
  RETURN QUERY INSERT INTO marketplace.dealer_live_comments (stream_id, author_id, body)
    VALUES (p_stream_id, v_actor, v_body)
    RETURNING id, marketplace.dealer_live_comments.created_at;
END;
$$;

REVOKE ALL ON FUNCTION marketplace.post_dealer_live_comment(UUID, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.post_dealer_live_comment(UUID, TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
