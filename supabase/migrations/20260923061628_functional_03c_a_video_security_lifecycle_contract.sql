BEGIN;

-- FUNCTIONAL-03C-A makes the V1 video relationship explicit without deleting
-- legacy rows. Legacy rows remain historical only: they are never current and
-- therefore cannot satisfy the canonical public-video predicate.
ALTER TABLE marketplace.listing_videos
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN marketplace.listing_videos.is_current IS
  'FUNCTIONAL-03C-A current Web V1 slot marker. Only a current, approved, eligible video can be public.';

ALTER TABLE marketplace.listing_videos
  ADD CONSTRAINT listing_videos_new_rows_require_listing_chk
  CHECK (listing_id IS NOT NULL) NOT VALID;

COMMENT ON CONSTRAINT listing_videos_new_rows_require_listing_chk ON marketplace.listing_videos IS
  'Legacy nullable rows are preserved without validation; every new or changed row must be attached to a listing.';

CREATE UNIQUE INDEX listing_videos_one_current_slot_per_listing_idx
  ON marketplace.listing_videos (listing_id)
  WHERE is_current;

CREATE UNIQUE INDEX listing_videos_one_current_storage_path_idx
  ON marketplace.listing_videos (storage_path)
  WHERE is_current;

ALTER TABLE marketplace.listing_videos
  DROP CONSTRAINT IF EXISTS listing_videos_listing_id_fkey;
ALTER TABLE marketplace.listing_videos
  ADD CONSTRAINT listing_videos_listing_id_fkey
  FOREIGN KEY (listing_id) REFERENCES marketplace.listings(id) ON DELETE RESTRICT;

-- The predicate is the sole public eligibility definition for a listing video.
-- A verification revocation hides otherwise approved video immediately.
CREATE OR REPLACE FUNCTION marketplace.is_listing_video_publicly_eligible(p_video_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM marketplace.listing_videos AS video
    JOIN marketplace.listings AS listing ON listing.id = video.listing_id
    WHERE video.id = p_video_id
      AND video.is_current
      AND video.status = 'active'
      AND video.visibility = 'public'
      AND video.moderation_status = 'approved'
      AND listing.status = 'active'
      AND listing.moderation_status = 'active'
      AND listing.archived_at IS NULL
      AND marketplace.is_listing_search_eligible(listing.id)
      AND public.is_verified_galeri(video.seller_user_id)
  );
$$;

-- This path predicate is used both by Storage RLS and controlled video RPCs.
-- The release segment preserves the existing storage cutover contract.
CREATE OR REPLACE FUNCTION marketplace.can_manage_own_listing_video_storage_path(p_storage_path TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_listing_id UUID;
  v_file_name TEXT;
BEGIN
  IF v_actor_id IS NULL OR p_storage_path IS NULL THEN
    RETURN FALSE;
  END IF;

  IF split_part(p_storage_path, '/', 1) <> v_actor_id::TEXT
     OR split_part(p_storage_path, '/', 2) <> 'prod04a-2026082801'
     OR split_part(p_storage_path, '/', 5) <> '' THEN
    RETURN FALSE;
  END IF;

  BEGIN
    v_listing_id := split_part(p_storage_path, '/', 3)::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN FALSE;
  END;

  v_file_name := split_part(p_storage_path, '/', 4);
  IF v_file_name !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$'
     OR NOT public.release_gate_allows_storage_write(p_storage_path)
     OR NOT public.is_verified_galeri(v_actor_id) THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM marketplace.listings AS listing
    WHERE listing.id = v_listing_id
      AND listing.seller_id = v_actor_id
      AND listing.archived_at IS NULL
      AND (
        (listing.status = 'draft' AND listing.moderation_status = 'pending_review')
        OR (listing.status = 'active' AND listing.moderation_status = 'active')
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.attach_own_listing_video(
  p_listing_id UUID,
  p_storage_path TEXT,
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
  v_video_id UUID;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF p_title IS NULL OR char_length(btrim(p_title)) NOT BETWEEN 1 AND 120
     OR (p_description IS NOT NULL AND char_length(p_description) > 500)
     OR p_duration_seconds IS NULL OR p_duration_seconds NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'invalid video metadata' USING ERRCODE = 'OT422';
  END IF;
  IF NOT marketplace.can_manage_own_listing_video_storage_path(p_storage_path) THEN
    RAISE EXCEPTION 'verified Galeri listing video authority required' USING ERRCODE = 'OT403';
  END IF;

  PERFORM 1 FROM marketplace.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404'; END IF;
  IF split_part(p_storage_path, '/', 3) <> p_listing_id::TEXT THEN
    RAISE EXCEPTION 'storage path does not belong to listing' USING ERRCODE = 'OT422';
  END IF;
  IF EXISTS (SELECT 1 FROM marketplace.listing_videos WHERE listing_id = p_listing_id AND is_current) THEN
    RAISE EXCEPTION 'listing already has a current video' USING ERRCODE = 'OT409';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects AS object
    WHERE object.bucket_id = 'listing-videos'
      AND object.name = p_storage_path
      AND object.owner_id = v_actor_id::TEXT
  ) THEN
    RAISE EXCEPTION 'uploaded video object not found' USING ERRCODE = 'OT422';
  END IF;

  INSERT INTO marketplace.listing_videos (
    listing_id, seller_user_id, title, description, video_url, original_video_url,
    storage_path, duration_seconds, status, visibility, processing_status,
    blur_status, moderation_status, is_current
  ) VALUES (
    p_listing_id, v_actor_id, btrim(p_title), NULLIF(btrim(p_description), ''),
    p_storage_path, p_storage_path, p_storage_path, p_duration_seconds,
    'pending_review', 'private', 'pending', 'not_started', 'pending_review', TRUE
  ) RETURNING id INTO v_video_id;

  RETURN v_video_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.replace_own_listing_video(
  p_listing_id UUID,
  p_storage_path TEXT,
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
  v_video_id UUID;
  v_previous_storage_path TEXT;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  IF p_title IS NULL OR char_length(btrim(p_title)) NOT BETWEEN 1 AND 120
     OR (p_description IS NOT NULL AND char_length(p_description) > 500)
     OR p_duration_seconds IS NULL OR p_duration_seconds NOT BETWEEN 1 AND 60 THEN
    RAISE EXCEPTION 'invalid video metadata' USING ERRCODE = 'OT422';
  END IF;
  IF NOT marketplace.can_manage_own_listing_video_storage_path(p_storage_path)
     OR split_part(p_storage_path, '/', 3) <> p_listing_id::TEXT THEN
    RAISE EXCEPTION 'verified Galeri listing video authority required' USING ERRCODE = 'OT403';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM storage.objects AS object
    WHERE object.bucket_id = 'listing-videos' AND object.name = p_storage_path AND object.owner_id = v_actor_id::TEXT
  ) THEN RAISE EXCEPTION 'uploaded video object not found' USING ERRCODE = 'OT422'; END IF;

  SELECT video.id, video.storage_path INTO v_video_id, v_previous_storage_path
  FROM marketplace.listing_videos AS video
  WHERE video.listing_id = p_listing_id
    AND video.seller_user_id = v_actor_id
    AND video.is_current
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'current listing video not found' USING ERRCODE = 'OT404'; END IF;

  UPDATE marketplace.listing_videos AS video
  SET title = btrim(p_title), description = NULLIF(btrim(p_description), ''),
      video_url = p_storage_path, original_video_url = p_storage_path, processed_video_url = NULL,
      storage_path = p_storage_path, duration_seconds = p_duration_seconds,
      status = 'pending_review', visibility = 'private', processing_status = 'pending',
      blur_status = 'not_started', moderation_status = 'pending_review', processing_error = NULL,
      processed_at = NULL, moderation_note = NULL, rejection_reason = NULL,
      moderated_by = NULL, moderated_at = NULL
  WHERE video.id = v_video_id;

  RETURN QUERY SELECT v_video_id, v_previous_storage_path;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_own_listing_video(p_listing_id UUID)
RETURNS TABLE (video_id UUID, storage_path TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_path TEXT;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT video.storage_path INTO v_path FROM marketplace.listing_videos AS video
  WHERE video.listing_id = p_listing_id AND video.seller_user_id = v_actor_id AND video.is_current FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'current listing video not found' USING ERRCODE = 'OT404'; END IF;
  IF NOT marketplace.can_manage_own_listing_video_storage_path(v_path) THEN
    RAISE EXCEPTION 'verified Galeri listing video authority required' USING ERRCODE = 'OT403';
  END IF;
  RETURN QUERY
  UPDATE marketplace.listing_videos AS video
  SET is_current = FALSE, status = 'archived', visibility = 'private', moderation_status = 'archived'
  WHERE video.listing_id = p_listing_id AND video.seller_user_id = v_actor_id AND video.is_current
  RETURNING video.id, video.storage_path;
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.sync_listing_search_document_video_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_listing_id UUID := COALESCE(NEW.listing_id, OLD.listing_id);
BEGIN
  IF v_listing_id IS NOT NULL THEN PERFORM marketplace.refresh_listing_search_document(v_listing_id); END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.refresh_listing_search_document(p_listing_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = marketplace, vehicle, pg_catalog AS $$
BEGIN
 IF NOT marketplace.is_listing_search_eligible(p_listing_id) THEN DELETE FROM marketplace.listing_search_documents WHERE listing_id=p_listing_id; RETURN; END IF;
 INSERT INTO marketplace.listing_search_documents (listing_id,make_id,model_id,variant_id,make_name,model_name,variant_name,condition,year,mileage_km,fuel_type,transmission,body_type,drive_type,color,engine_volume_l,power_kw,battery_capacity_kwh,electric_range_km,seller_service_declaration,seller_damage_declaration,price_amount,currency,price_negotiable,trade_in_accepted,city_id,district_id,city_name,district_name,seller_type,cover_image_url,photo_count,has_video,published_at,projected_at)
 SELECT l.id,vp.make_id,vp.model_id,vp.variant_id,ma.name,mo.name,va.name,vp.condition::text,vp.year,vp.mileage_km,vp.fuel_type::text,vp.transmission::text,vp.body_type,vp.drive_type,vp.color,vp.engine_volume_l,vp.power_kw,vp.battery_capacity_kwh,vp.electric_range_km,vp.seller_service_declaration::text,vp.seller_damage_declaration::text,l.price_amount,l.currency,l.price_negotiable,l.trade_in_accepted,l.city_id,l.district_id,ci.name,di.name,l.seller_type,cm.url,coalesce(mc.n,0),EXISTS (SELECT 1 FROM marketplace.listing_videos AS video WHERE video.listing_id=l.id AND marketplace.is_listing_video_publicly_eligible(video.id)),l.published_at,now()
 FROM marketplace.listings l JOIN vehicle.vehicle_profiles vp ON vp.id=l.vehicle_profile_id JOIN vehicle.makes ma ON ma.id=vp.make_id JOIN vehicle.models mo ON mo.id=vp.model_id LEFT JOIN vehicle.variants va ON va.id=vp.variant_id LEFT JOIN marketplace.cities ci ON ci.id=l.city_id LEFT JOIN marketplace.districts di ON di.id=l.district_id LEFT JOIN LATERAL(SELECT url FROM vehicle.profile_media WHERE vehicle_profile_id=vp.id ORDER BY is_cover DESC,sort_order LIMIT 1) cm ON true LEFT JOIN LATERAL(SELECT count(*)::int n FROM vehicle.profile_media WHERE vehicle_profile_id=vp.id) mc ON true WHERE l.id=p_listing_id
 ON CONFLICT(listing_id) DO UPDATE SET price_amount=EXCLUDED.price_amount,has_video=EXCLUDED.has_video,projected_at=EXCLUDED.projected_at;
END;$$;

DROP TRIGGER IF EXISTS listing_search_document_video_lifecycle_sync ON marketplace.listing_videos;
CREATE TRIGGER listing_search_document_video_lifecycle_sync
AFTER INSERT OR UPDATE OR DELETE ON marketplace.listing_videos
FOR EACH ROW EXECUTE FUNCTION marketplace.sync_listing_search_document_video_lifecycle();

DROP POLICY IF EXISTS listing_videos_select_public_active ON marketplace.listing_videos;
CREATE POLICY listing_videos_select_public_active ON marketplace.listing_videos
FOR SELECT TO anon, authenticated
USING (marketplace.is_listing_video_publicly_eligible(id));
DROP POLICY IF EXISTS listing_videos_insert_own ON marketplace.listing_videos;
DROP POLICY IF EXISTS listing_videos_update_own_pending ON marketplace.listing_videos;
DROP POLICY IF EXISTS listing_videos_delete_own_pending ON marketplace.listing_videos;
REVOKE INSERT, UPDATE, DELETE ON marketplace.listing_videos FROM authenticated;

DROP POLICY IF EXISTS listing_videos_storage_select_authorized ON storage.objects;
CREATE POLICY listing_videos_storage_select_authorized ON storage.objects
FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'listing-videos' AND (
    public.is_admin(auth.uid())
    OR marketplace.can_manage_own_listing_video_storage_path(name)
    OR EXISTS (SELECT 1 FROM marketplace.listing_videos AS video WHERE video.storage_path = storage.objects.name AND marketplace.is_listing_video_publicly_eligible(video.id))
  )
);
DROP POLICY IF EXISTS listing_videos_storage_insert_own_folder ON storage.objects;
DROP POLICY IF EXISTS listing_videos_storage_update_own_folder ON storage.objects;
DROP POLICY IF EXISTS listing_videos_storage_delete_own_folder ON storage.objects;
CREATE POLICY listing_videos_storage_insert_own_listing ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'listing-videos' AND marketplace.can_manage_own_listing_video_storage_path(name));
CREATE POLICY listing_videos_storage_update_own_listing ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'listing-videos' AND marketplace.can_manage_own_listing_video_storage_path(name))
WITH CHECK (bucket_id = 'listing-videos' AND marketplace.can_manage_own_listing_video_storage_path(name));
CREATE POLICY listing_videos_storage_delete_own_listing ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'listing-videos' AND marketplace.can_manage_own_listing_video_storage_path(name));

REVOKE ALL ON FUNCTION marketplace.is_listing_video_publicly_eligible(UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.can_manage_own_listing_video_storage_path(TEXT) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.attach_own_listing_video(UUID, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.replace_own_listing_video(UUID, TEXT, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.remove_own_listing_video(UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.sync_listing_search_document_video_lifecycle() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.is_listing_video_publicly_eligible(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.can_manage_own_listing_video_storage_path(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.attach_own_listing_video(UUID, TEXT, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_own_listing_video(UUID, TEXT, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_own_listing_video(UUID) TO authenticated;

COMMENT ON FUNCTION public.attach_own_listing_video(UUID, TEXT, TEXT, TEXT, INTEGER) IS
  'FUNCTIONAL-03C-A controlled attach boundary. 03C-B uploads first, calls this RPC, and compensates by deleting the object when attach fails.';
COMMENT ON FUNCTION public.replace_own_listing_video(UUID, TEXT, TEXT, TEXT, INTEGER) IS
  'FUNCTIONAL-03C-A controlled replacement boundary. Returns the previous path so 03C-B can perform best-effort storage cleanup after commit.';
COMMENT ON FUNCTION public.remove_own_listing_video(UUID) IS
  'FUNCTIONAL-03C-A logical removal boundary. It archives metadata and returns the object path for 03C-B cleanup; database functions do not call Storage.';

NOTIFY pgrst, 'reload schema';
COMMIT;
