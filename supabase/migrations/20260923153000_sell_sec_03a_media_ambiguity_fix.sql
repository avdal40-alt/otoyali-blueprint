BEGIN;

-- SELL-SEC-03A corrective migration. The previously applied contract is
-- immutable; this redefinition only removes PL/pgSQL/table-column ambiguity.
CREATE OR REPLACE FUNCTION public.attach_own_listing_media(
  p_listing_id UUID,
  p_media_id UUID,
  p_storage_path TEXT,
  p_original_path TEXT,
  p_large_path TEXT,
  p_card_path TEXT,
  p_thumb_path TEXT,
  p_sort_order SMALLINT,
  p_is_cover BOOLEAN,
  p_width INTEGER DEFAULT NULL,
  p_height INTEGER DEFAULT NULL,
  p_aspect_ratio NUMERIC DEFAULT NULL,
  p_mime_type TEXT DEFAULT NULL,
  p_size_bytes BIGINT DEFAULT NULL,
  p_processed_status TEXT DEFAULT 'processed'
)
RETURNS TABLE (media_id UUID, sort_order SMALLINT, is_cover BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_vehicle_profile_id UUID;
  v_existing RECORD;
  v_path RECORD;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF p_listing_id IS NULL OR p_media_id IS NULL OR p_storage_path IS NULL
     OR char_length(btrim(p_storage_path)) = 0 OR p_sort_order IS NULL OR p_sort_order < 0
     OR p_is_cover IS NULL
     OR (p_width IS NOT NULL AND p_width <= 0)
     OR (p_height IS NOT NULL AND p_height <= 0)
     OR (p_aspect_ratio IS NOT NULL AND p_aspect_ratio <= 0)
     OR (p_mime_type IS NOT NULL AND p_mime_type NOT IN ('image/jpeg', 'image/png', 'image/webp'))
     OR (p_size_bytes IS NOT NULL AND p_size_bytes <= 0)
     OR p_processed_status IS NULL OR p_processed_status NOT IN ('processed', 'failed') THEN
    RAISE EXCEPTION 'invalid media attachment' USING ERRCODE = 'OT422';
  END IF;

  SELECT listing.vehicle_profile_id
  INTO v_vehicle_profile_id
  FROM marketplace.listings AS listing
  WHERE listing.id = p_listing_id
    AND listing.seller_id = v_user_id
    AND listing.status = 'draft'
    AND listing.moderation_status = 'pending_review'
    AND listing.archived_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR NOT vehicle.is_current_profile_owner(v_vehicle_profile_id, v_user_id) THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  SELECT media.id, media.sort_order, media.is_cover
  INTO v_existing
  FROM vehicle.profile_media AS media
  WHERE media.id = p_media_id
  FOR UPDATE;
  IF FOUND THEN
    IF (SELECT media.vehicle_profile_id FROM vehicle.profile_media AS media WHERE media.id = p_media_id) <> v_vehicle_profile_id THEN
      RAISE EXCEPTION 'media identifier conflict' USING ERRCODE = 'OT409';
    END IF;
    RETURN QUERY SELECT v_existing.id, v_existing.sort_order, v_existing.is_cover;
    RETURN;
  END IF;

  FOR v_path IN
    SELECT * FROM (VALUES
      ('storage', p_storage_path), ('original', p_original_path), ('large', p_large_path),
      ('card', p_card_path), ('thumb', p_thumb_path)
    ) AS paths(variant_name, object_path)
    WHERE object_path IS NOT NULL
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM storage.objects AS object
      WHERE object.bucket_id = 'listing-media'
        AND object.name = v_path.object_path
        AND COALESCE(object.owner_id, object.owner::TEXT) = v_user_id::TEXT
        AND vehicle.profile_media_path_matches(
          object.name, v_user_id, v_vehicle_profile_id, p_media_id, v_path.variant_name
        )
        AND COALESCE(object.metadata ->> 'mimetype', '') IN ('image/jpeg', 'image/png', 'image/webp')
    ) THEN
      RAISE EXCEPTION 'media object is not authorized for this listing' USING ERRCODE = 'OT403';
    END IF;
  END LOOP;

  IF p_is_cover THEN
    UPDATE vehicle.profile_media AS media
    SET is_cover = FALSE
    WHERE media.vehicle_profile_id = v_vehicle_profile_id
      AND media.is_cover = TRUE;
  END IF;

  INSERT INTO vehicle.profile_media (
    id, vehicle_profile_id, storage_path, url, original_path, large_path,
    card_path, thumb_path, media_type, sort_order, is_cover, width, height,
    aspect_ratio, mime_type, size_bytes, processed_status, blur_status
  ) VALUES (
    p_media_id, v_vehicle_profile_id, p_storage_path, p_storage_path, p_original_path,
    p_large_path, p_card_path, p_thumb_path, 'image', p_sort_order, p_is_cover,
    p_width, p_height, p_aspect_ratio, p_mime_type, p_size_bytes,
    p_processed_status, 'not_started'
  );

  IF p_is_cover THEN
    PERFORM public.set_own_listing_cover_media(p_listing_id, p_media_id);
  END IF;

  RETURN QUERY SELECT p_media_id, p_sort_order, p_is_cover;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_own_listing_media(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, SMALLINT, BOOLEAN, INTEGER, INTEGER, NUMERIC, TEXT, BIGINT, TEXT) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.attach_own_listing_media(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, SMALLINT, BOOLEAN, INTEGER, INTEGER, NUMERIC, TEXT, BIGINT, TEXT) TO authenticated;

COMMENT ON FUNCTION public.attach_own_listing_media(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, SMALLINT, BOOLEAN, INTEGER, INTEGER, NUMERIC, TEXT, BIGINT, TEXT) IS
  'SELL-SEC-03A owner-only draft media association. Canonical object paths are validated against storage ownership and profile/media namespace; paths are never returned.';

NOTIFY pgrst, 'reload schema';

COMMIT;
