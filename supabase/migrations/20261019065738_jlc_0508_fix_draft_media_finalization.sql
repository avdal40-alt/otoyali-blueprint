BEGIN;

-- Keep private drafts eligible for owner-scoped sanitization while retaining
-- compatibility for legacy drafts already awaiting moderation.
CREATE OR REPLACE FUNCTION public.finalize_own_listing_sanitized_photo(
  p_listing_id UUID, p_media_id UUID, p_temp_path TEXT,
  p_sanitized_master_path TEXT, p_large_path TEXT, p_card_path TEXT,
  p_thumb_path TEXT, p_sort_order SMALLINT, p_is_cover BOOLEAN,
  p_width INTEGER, p_height INTEGER, p_aspect_ratio NUMERIC,
  p_mime_type TEXT, p_size_bytes BIGINT
)
RETURNS TABLE(media_id UUID, sort_order SMALLINT, is_cover BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_user UUID := auth.uid();
  v_profile UUID;
  v_path TEXT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF p_listing_id IS NULL OR p_media_id IS NULL OR p_sort_order IS NULL OR p_sort_order < 0
    OR p_is_cover IS NULL OR p_width <= 0 OR p_height <= 0 OR p_aspect_ratio <= 0
    OR p_mime_type NOT IN ('image/jpeg', 'image/png', 'image/webp') OR p_size_bytes <= 0 THEN
    RAISE EXCEPTION 'invalid sanitized media' USING ERRCODE = 'OT422';
  END IF;

  SELECT l.vehicle_profile_id INTO v_profile
  FROM marketplace.listings l
  WHERE l.id = p_listing_id AND l.seller_id = v_user AND l.status = 'draft'
    AND l.moderation_status IN ('draft', 'pending_review') AND l.archived_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR NOT vehicle.is_current_profile_owner(v_profile, v_user) THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;
  IF p_temp_path !~ ('^temp/' || v_user::TEXT || '/[0-9a-f-]{36}/[^/]+$')
    OR NOT EXISTS (
      SELECT 1 FROM storage.objects o
      WHERE o.bucket_id = 'listing-media' AND o.name = p_temp_path
        AND coalesce(o.owner_id, o.owner::TEXT) = v_user::TEXT
    ) THEN RAISE EXCEPTION 'temporary source not found' USING ERRCODE = 'OT403'; END IF;
  FOREACH v_path IN ARRAY ARRAY[p_sanitized_master_path, p_large_path, p_card_path, p_thumb_path] LOOP
    IF v_path IS NULL
      OR v_path !~ ('^public/' || v_profile::TEXT || '/' || p_media_id::TEXT || '/(master|large|card|thumb)[.](webp|jpg|jpeg|png)$')
      OR NOT EXISTS (
        SELECT 1 FROM storage.objects o
        WHERE o.bucket_id = 'listing-media' AND o.name = v_path AND o.owner_id IS NULL
      ) THEN RAISE EXCEPTION 'sanitized derivative not authorized' USING ERRCODE = 'OT403'; END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM vehicle.profile_media pm WHERE pm.id = p_media_id) THEN
    RAISE EXCEPTION 'media identifier conflict' USING ERRCODE = 'OT409';
  END IF;
  IF p_is_cover THEN
    UPDATE vehicle.profile_media pm SET is_cover = FALSE
    WHERE pm.vehicle_profile_id = v_profile AND pm.is_cover;
  END IF;
  INSERT INTO vehicle.profile_media (
    id, vehicle_profile_id, storage_path, url, original_path, large_path, card_path, thumb_path,
    media_type, sort_order, is_cover, width, height, aspect_ratio, mime_type, size_bytes,
    processed_status, blur_status, privacy_version, sanitized_at
  ) VALUES (
    p_media_id, v_profile, p_large_path, p_large_path, p_sanitized_master_path, p_large_path,
    p_card_path, p_thumb_path, 'image', p_sort_order, p_is_cover, p_width, p_height,
    p_aspect_ratio, p_mime_type, p_size_bytes, 'processed', 'blurred', 1, now()
  );
  IF p_is_cover THEN PERFORM public.set_own_listing_cover_media(p_listing_id, p_media_id); END IF;
  RETURN QUERY SELECT p_media_id, p_sort_order, p_is_cover;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_own_listing_sanitized_photo(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, SMALLINT, BOOLEAN, INTEGER, INTEGER, NUMERIC, TEXT, BIGINT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_own_listing_sanitized_photo(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, SMALLINT, BOOLEAN, INTEGER, INTEGER, NUMERIC, TEXT, BIGINT) TO authenticated;

-- Submission is fail-closed: browser-only photo state cannot move a listing
-- to moderation. Only durable, finalized profile media tied to this listing's
-- current vehicle profile counts; its stored cover must be one of those rows.
CREATE OR REPLACE FUNCTION public.submit_own_listing_for_review(p_listing_id UUID)
RETURNS TABLE(listing_id UUID, status TEXT, moderation_status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_listing marketplace.listings%ROWTYPE;
  v_finalized_photo_count INTEGER;
  v_cover_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT * INTO v_listing FROM marketplace.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404'; END IF;
  IF v_listing.seller_id <> v_user_id
    OR NOT vehicle.is_current_profile_owner(v_listing.vehicle_profile_id, v_user_id) THEN
    RAISE EXCEPTION 'listing owner authorization required' USING ERRCODE = 'OT403';
  END IF;
  IF v_listing.status <> 'draft' OR v_listing.moderation_status <> 'draft' OR v_listing.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'illegal listing lifecycle transition' USING ERRCODE = 'OT409';
  END IF;

  SELECT count(*) INTO v_finalized_photo_count
  FROM vehicle.profile_media pm
  WHERE pm.vehicle_profile_id = v_listing.vehicle_profile_id
    AND pm.media_type = 'image' AND pm.processed_status = 'processed'
    AND pm.blur_status = 'blurred'
    AND pm.storage_path IS NOT NULL AND pm.original_path IS NOT NULL
    AND pm.large_path IS NOT NULL AND pm.card_path IS NOT NULL AND pm.thumb_path IS NOT NULL;
  IF v_finalized_photo_count < 3 THEN
    RAISE EXCEPTION 'at least three finalized photos are required' USING ERRCODE = 'OT422';
  END IF;

  SELECT count(*) INTO v_cover_count
  FROM vehicle.profile_media pm
  WHERE pm.id = v_listing.cover_media_id
    AND pm.vehicle_profile_id = v_listing.vehicle_profile_id
    AND pm.is_cover = TRUE AND pm.media_type = 'image'
    AND pm.processed_status = 'processed' AND pm.blur_status = 'blurred'
    AND pm.storage_path IS NOT NULL AND pm.original_path IS NOT NULL
    AND pm.large_path IS NOT NULL AND pm.card_path IS NOT NULL AND pm.thumb_path IS NOT NULL;
  IF v_cover_count < 1 THEN
    RAISE EXCEPTION 'a finalized cover photo is required' USING ERRCODE = 'OT422';
  END IF;

  UPDATE marketplace.listings AS l
  SET moderation_status = 'pending_review', moderation_note = NULL,
      rejection_reason = NULL, moderated_by = NULL, moderated_at = NULL
  WHERE l.id = p_listing_id AND l.status = 'draft' AND l.moderation_status = 'draft'
  RETURNING l.id, l.status::TEXT, l.moderation_status INTO listing_id, status, moderation_status;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing lifecycle changed during submit' USING ERRCODE = 'OT409'; END IF;

  INSERT INTO public.admin_audit_logs (actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (v_user_id, 'listing.submit', 'listing', p_listing_id,
    jsonb_build_object('previous_status', 'draft', 'previous_moderation_status', 'draft', 'new_status', 'draft', 'new_moderation_status', 'pending_review'));
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_own_listing_for_review(UUID) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.submit_own_listing_for_review(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
