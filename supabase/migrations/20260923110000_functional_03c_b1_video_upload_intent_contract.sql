BEGIN;

CREATE TABLE marketplace.listing_video_upload_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace.listings(id) ON DELETE RESTRICT,
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  object_path TEXT NOT NULL UNIQUE,
  operation TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  declared_size_bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  CONSTRAINT listing_video_upload_intents_operation_chk CHECK (operation IN ('create', 'replace')),
  CONSTRAINT listing_video_upload_intents_mime_chk CHECK (mime_type IN ('video/mp4', 'video/webm', 'video/quicktime')),
  CONSTRAINT listing_video_upload_intents_size_chk CHECK (declared_size_bytes > 0 AND declared_size_bytes <= 104857600),
  CONSTRAINT listing_video_upload_intents_expiry_chk CHECK (expires_at > created_at),
  CONSTRAINT listing_video_upload_intents_terminal_chk CHECK (consumed_at IS NULL OR revoked_at IS NULL)
);

COMMENT ON TABLE marketplace.listing_video_upload_intents IS
  'Private, short-lived, one-time authority binding an owned listing video object path to a verified Galeri upload.';

CREATE INDEX listing_video_upload_intents_active_path_idx
  ON marketplace.listing_video_upload_intents (object_path, owner_user_id, expires_at)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;

ALTER TABLE marketplace.listing_video_upload_intents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE marketplace.listing_video_upload_intents FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE marketplace.listing_video_upload_intents TO service_role;

CREATE OR REPLACE FUNCTION marketplace.can_insert_own_listing_video_from_active_intent(p_storage_path TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND marketplace.can_manage_own_listing_video_storage_path(p_storage_path)
    AND EXISTS (
      SELECT 1
      FROM marketplace.listing_video_upload_intents AS intent
      WHERE intent.object_path = p_storage_path
        AND intent.owner_user_id = auth.uid()
        AND intent.listing_id::TEXT = split_part(p_storage_path, '/', 3)
        AND intent.expires_at > NOW()
        AND intent.consumed_at IS NULL
        AND intent.revoked_at IS NULL
    );
$$;

CREATE OR REPLACE FUNCTION public.issue_own_listing_video_upload_intent(
  p_listing_id UUID,
  p_operation TEXT,
  p_mime_type TEXT,
  p_declared_size_bytes BIGINT
)
RETURNS TABLE (intent_id UUID, object_path TEXT, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_intent_id UUID := gen_random_uuid();
  v_extension TEXT;
  v_object_path TEXT;
  v_has_current_video BOOLEAN;
  v_expires_at TIMESTAMPTZ := NOW() + INTERVAL '15 minutes';
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF p_operation NOT IN ('create', 'replace')
     OR p_mime_type NOT IN ('video/mp4', 'video/webm', 'video/quicktime')
     OR p_declared_size_bytes IS NULL OR p_declared_size_bytes <= 0 OR p_declared_size_bytes > 104857600 THEN
    RAISE EXCEPTION 'invalid video upload intent' USING ERRCODE = 'OT422';
  END IF;

  v_extension := CASE p_mime_type WHEN 'video/mp4' THEN 'mp4' WHEN 'video/webm' THEN 'webm' ELSE 'mov' END;
  v_object_path := v_actor_id::TEXT || '/prod04a-2026082801/' || p_listing_id::TEXT || '/' || v_intent_id::TEXT || '.' || v_extension;

  IF NOT marketplace.can_manage_own_listing_video_storage_path(v_object_path) THEN
    RAISE EXCEPTION 'verified Galeri listing video authority required' USING ERRCODE = 'OT403';
  END IF;

  PERFORM 1 FROM marketplace.listings WHERE id = p_listing_id AND seller_id = v_actor_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM marketplace.listing_videos WHERE listing_id = p_listing_id AND is_current
  ) INTO v_has_current_video;
  IF (p_operation = 'create' AND v_has_current_video) OR (p_operation = 'replace' AND NOT v_has_current_video) THEN
    RAISE EXCEPTION 'video slot operation is not available' USING ERRCODE = 'OT409';
  END IF;

  INSERT INTO marketplace.listing_video_upload_intents (
    id, listing_id, owner_user_id, object_path, operation, mime_type, declared_size_bytes, expires_at
  ) VALUES (
    v_intent_id, p_listing_id, v_actor_id, v_object_path, p_operation, p_mime_type, p_declared_size_bytes, v_expires_at
  );
  RETURN QUERY SELECT v_intent_id, v_object_path, v_expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_own_listing_video_upload_intent(
  p_listing_id UUID,
  p_intent_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_duration_seconds INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_intent marketplace.listing_video_upload_intents%ROWTYPE;
  v_video_id UUID;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT * INTO v_intent FROM marketplace.listing_video_upload_intents
  WHERE id = p_intent_id AND listing_id = p_listing_id AND owner_user_id = v_actor_id FOR UPDATE;
  IF NOT FOUND OR v_intent.operation <> 'create' OR v_intent.expires_at <= NOW() OR v_intent.consumed_at IS NOT NULL OR v_intent.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'video upload intent is unavailable' USING ERRCODE = 'OT422';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'listing-videos' AND name = v_intent.object_path AND owner_id = v_actor_id::TEXT) THEN
    RAISE EXCEPTION 'uploaded video object not found' USING ERRCODE = 'OT422';
  END IF;
  SELECT public.attach_own_listing_video(p_listing_id, v_intent.object_path, p_title, p_description, p_duration_seconds) INTO v_video_id;
  UPDATE marketplace.listing_video_upload_intents SET consumed_at = NOW() WHERE id = v_intent.id AND consumed_at IS NULL;
  RETURN v_video_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.replace_own_listing_video_upload_intent(
  p_listing_id UUID,
  p_intent_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_duration_seconds INTEGER DEFAULT NULL
)
RETURNS TABLE (video_id UUID, previous_storage_path TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_intent marketplace.listing_video_upload_intents%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT * INTO v_intent FROM marketplace.listing_video_upload_intents
  WHERE id = p_intent_id AND listing_id = p_listing_id AND owner_user_id = v_actor_id FOR UPDATE;
  IF NOT FOUND OR v_intent.operation <> 'replace' OR v_intent.expires_at <= NOW() OR v_intent.consumed_at IS NOT NULL OR v_intent.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'video upload intent is unavailable' USING ERRCODE = 'OT422';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id = 'listing-videos' AND name = v_intent.object_path AND owner_id = v_actor_id::TEXT) THEN
    RAISE EXCEPTION 'uploaded video object not found' USING ERRCODE = 'OT422';
  END IF;
  RETURN QUERY SELECT * FROM public.replace_own_listing_video(p_listing_id, v_intent.object_path, p_title, p_description, p_duration_seconds);
  UPDATE marketplace.listing_video_upload_intents SET consumed_at = NOW() WHERE id = v_intent.id AND consumed_at IS NULL;
END;
$$;

DROP POLICY IF EXISTS listing_videos_storage_insert_own_listing ON storage.objects;
CREATE POLICY listing_videos_storage_insert_issued_intent ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'listing-videos'
  AND marketplace.can_insert_own_listing_video_from_active_intent(name)
);

REVOKE ALL ON FUNCTION marketplace.can_insert_own_listing_video_from_active_intent(TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.issue_own_listing_video_upload_intent(UUID, TEXT, TEXT, BIGINT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.finalize_own_listing_video_upload_intent(UUID, UUID, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.replace_own_listing_video_upload_intent(UUID, UUID, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.attach_own_listing_video(UUID, TEXT, TEXT, TEXT, INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.replace_own_listing_video(UUID, TEXT, TEXT, TEXT, INTEGER) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.issue_own_listing_video_upload_intent(UUID, TEXT, TEXT, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_own_listing_video_upload_intent(UUID, UUID, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_own_listing_video_upload_intent(UUID, UUID, TEXT, TEXT, INTEGER) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
