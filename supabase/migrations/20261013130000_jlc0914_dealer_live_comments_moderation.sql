BEGIN;

-- JLC-0914: comments are private application data. Public clients can only
-- receive visible comments through the deliberately narrow facade below.
CREATE TYPE marketplace.dealer_live_comment_status AS ENUM ('visible', 'blocked');

CREATE TABLE marketplace.dealer_live_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID NOT NULL REFERENCES marketplace.dealer_live_streams(id) ON DELETE RESTRICT,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  status marketplace.dealer_live_comment_status NOT NULL DEFAULT 'visible',
  blocked_at TIMESTAMPTZ,
  blocked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  block_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dealer_live_comments_body_chk CHECK (char_length(btrim(body)) BETWEEN 1 AND 500),
  CONSTRAINT dealer_live_comments_block_state_chk CHECK (
    (status = 'visible' AND blocked_at IS NULL AND blocked_by IS NULL AND block_reason IS NULL)
    OR (status = 'blocked' AND blocked_at IS NOT NULL AND blocked_by IS NOT NULL
      AND char_length(btrim(block_reason)) BETWEEN 1 AND 500)
  )
);

CREATE TABLE marketplace.dealer_live_comment_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES marketplace.dealer_live_comments(id) ON DELETE RESTRICT,
  stream_id UUID NOT NULL REFERENCES marketplace.dealer_live_streams(id) ON DELETE RESTRICT,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dealer_live_comment_reports_reason_chk CHECK (reason IN ('spam', 'fraud', 'inappropriate_content', 'harassment', 'other')),
  CONSTRAINT dealer_live_comment_reports_comment_reporter_key UNIQUE (comment_id, reporter_id)
);

CREATE INDEX dealer_live_comments_stream_visible_created_idx
  ON marketplace.dealer_live_comments (stream_id, created_at DESC, id DESC) WHERE status = 'visible';
CREATE INDEX dealer_live_comment_reports_moderation_idx
  ON marketplace.dealer_live_comment_reports (created_at DESC, id DESC);

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
  -- Serialize each actor's submission check so concurrent requests cannot bypass it.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_actor::text, 914));
  IF (SELECT count(*) FROM marketplace.dealer_live_comments
      WHERE author_id = v_actor AND created_at >= now() - interval '1 minute') >= 10 THEN
    RAISE EXCEPTION 'live comment rate limit exceeded' USING ERRCODE = 'OT429';
  END IF;
  RETURN QUERY INSERT INTO marketplace.dealer_live_comments (stream_id, author_id, body)
    VALUES (p_stream_id, v_actor, v_body)
    RETURNING id, marketplace.dealer_live_comments.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.report_dealer_live_comment(p_comment_id UUID, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_reason TEXT := btrim(COALESCE(p_reason, ''));
  v_stream_id UUID;
BEGIN
  IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF v_reason NOT IN ('spam', 'fraud', 'inappropriate_content', 'harassment', 'other') THEN
    RAISE EXCEPTION 'invalid live comment report reason' USING ERRCODE = 'OT422'; END IF;
  SELECT stream_id INTO v_stream_id FROM marketplace.dealer_live_comments WHERE id = p_comment_id AND status = 'visible';
  IF NOT FOUND THEN RAISE EXCEPTION 'reportable live comment required' USING ERRCODE = 'OT404'; END IF;
  INSERT INTO marketplace.dealer_live_comment_reports (comment_id, stream_id, reporter_id, reason)
  VALUES (p_comment_id, v_stream_id, v_actor, v_reason)
  ON CONFLICT (comment_id, reporter_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.block_dealer_live_comment(p_comment_id UUID, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_reason TEXT := NULLIF(btrim(p_reason), '');
BEGIN
  IF v_actor IS NULL OR COALESCE(public.admin_role(v_actor), '') NOT IN ('owner', 'admin', 'moderator') THEN
    RAISE EXCEPTION 'authorized live moderator required' USING ERRCODE = 'OT403'; END IF;
  IF char_length(COALESCE(v_reason, '')) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'live comment block reason required' USING ERRCODE = 'OT422'; END IF;
  UPDATE marketplace.dealer_live_comments
  SET status = 'blocked', blocked_at = now(), blocked_by = v_actor, block_reason = v_reason
  WHERE id = p_comment_id AND status = 'visible';
  IF NOT FOUND THEN RAISE EXCEPTION 'blockable live comment required' USING ERRCODE = 'OT409'; END IF;
  INSERT INTO public.admin_audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (v_actor, 'dealer_live.comment_block', 'dealer_live_comment', p_comment_id, jsonb_build_object('reason', v_reason));
END;
$$;

CREATE OR REPLACE FUNCTION public.list_public_dealer_live_comments(p_stream_id UUID, p_limit INTEGER DEFAULT 50)
RETURNS TABLE (comment_id UUID, body TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, marketplace, pg_catalog
AS $$
  SELECT comment.id, comment.body, comment.created_at
  FROM marketplace.dealer_live_comments comment
  JOIN marketplace.dealer_live_streams stream ON stream.id = comment.stream_id
  WHERE comment.stream_id = p_stream_id AND comment.status = 'visible' AND stream.status = 'live'
    AND public.is_verified_dealer(stream.dealer_id)
  ORDER BY comment.created_at DESC, comment.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
$$;

ALTER TABLE marketplace.dealer_live_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.dealer_live_comment_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY dealer_live_comments_service_role_all ON marketplace.dealer_live_comments FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY dealer_live_comment_reports_service_role_all ON marketplace.dealer_live_comment_reports FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
REVOKE ALL ON TABLE marketplace.dealer_live_comments, marketplace.dealer_live_comment_reports FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE marketplace.dealer_live_comments, marketplace.dealer_live_comment_reports TO service_role;
REVOKE ALL ON FUNCTION marketplace.post_dealer_live_comment(UUID, TEXT), marketplace.report_dealer_live_comment(UUID, TEXT), marketplace.block_dealer_live_comment(UUID, TEXT), public.list_public_dealer_live_comments(UUID, INTEGER) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.post_dealer_live_comment(UUID, TEXT), marketplace.report_dealer_live_comment(UUID, TEXT), marketplace.block_dealer_live_comment(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_dealer_live_comments(UUID, INTEGER) TO anon, authenticated;

COMMENT ON TABLE marketplace.dealer_live_comment_reports IS 'Private auditable Dealer Live comment reports. Reporters and moderation metadata are never public.';
COMMENT ON FUNCTION public.list_public_dealer_live_comments(UUID, INTEGER) IS 'Public-safe visible comments for an active verified-dealer live stream; excludes author and moderation identity.';
NOTIFY pgrst, 'reload schema';
COMMIT;
