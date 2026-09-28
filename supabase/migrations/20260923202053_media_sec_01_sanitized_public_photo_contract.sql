BEGIN;

-- MEDIA-SEC-01: new uploads are private temporary sources until a trusted
-- processor writes sanitized derivatives in the reserved public namespace.
ALTER TABLE vehicle.profile_media
  ADD COLUMN IF NOT EXISTS privacy_version SMALLINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sanitized_at TIMESTAMPTZ;
ALTER TABLE vehicle.profile_media
  ADD CONSTRAINT profile_media_privacy_version_chk CHECK (privacy_version IN (0, 1));
CREATE INDEX IF NOT EXISTS profile_media_privacy_version_idx ON vehicle.profile_media (privacy_version);
COMMENT ON COLUMN vehicle.profile_media.privacy_version IS '0 is legacy compatibility; 1 means only sanitized canonical paths are attached.';
COMMENT ON COLUMN vehicle.profile_media.sanitized_at IS 'Server-established time at which MEDIA-SEC-01 sanitized derivatives were finalized.';

-- Browser uploads are allowed only beneath temp/<actor>/..., never beneath
-- public/. The public namespace is reserved for trusted processing.
DROP POLICY IF EXISTS listing_media_insert_own_folder ON storage.objects;
CREATE POLICY listing_media_insert_temp_own ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'listing-media' AND (storage.foldername(name))[1] = 'temp' AND (storage.foldername(name))[2] = auth.uid()::TEXT);
DROP POLICY IF EXISTS listing_media_update_own_folder ON storage.objects;
CREATE POLICY listing_media_update_temp_own ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'listing-media' AND (storage.foldername(name))[1] = 'temp' AND (storage.foldername(name))[2] = auth.uid()::TEXT)
WITH CHECK (bucket_id = 'listing-media' AND (storage.foldername(name))[1] = 'temp' AND (storage.foldername(name))[2] = auth.uid()::TEXT);
DROP POLICY IF EXISTS listing_media_delete_own_folder ON storage.objects;
CREATE POLICY listing_media_delete_temp_own ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'listing-media' AND (storage.foldername(name))[1] = 'temp' AND (storage.foldername(name))[2] = auth.uid()::TEXT);

-- Active-listing public access is positive-scoped. Legacy rows are retained
-- for availability; all privacy_version=1 rows expose only public derivatives.
CREATE OR REPLACE FUNCTION vehicle.is_public_profile_media_object(
  p_bucket_id TEXT, p_object_name TEXT, p_object_owner_id TEXT, p_legacy_object_owner UUID
) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
  SELECT p_bucket_id IN ('vehicle-photos', 'listing-media') AND EXISTS (
    SELECT 1 FROM vehicle.profile_media AS media
    JOIN vehicle.profile_ownership AS ownership ON ownership.vehicle_profile_id=media.vehicle_profile_id AND ownership.is_current AND ownership.ended_at IS NULL
    JOIN marketplace.listings AS listing ON listing.vehicle_profile_id=media.vehicle_profile_id AND listing.seller_id=ownership.owner_id AND listing.status='active' AND listing.moderation_status='active'
    WHERE ((media.privacy_version=0 AND (storage.foldername(p_object_name))[1]=ownership.owner_id::TEXT AND p_object_name IN (media.storage_path,media.original_path,media.large_path,media.card_path,media.thumb_path))
        OR (media.privacy_version=1 AND p_bucket_id='listing-media' AND (storage.foldername(p_object_name))[1]='public' AND p_object_name IN (media.original_path,media.large_path,media.card_path,media.thumb_path)))
  );
$$;
REVOKE ALL ON FUNCTION vehicle.is_public_profile_media_object(TEXT,TEXT,TEXT,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION vehicle.is_public_profile_media_object(TEXT,TEXT,TEXT,UUID) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.finalize_own_listing_sanitized_photo(
  p_listing_id UUID, p_media_id UUID, p_temp_path TEXT, p_sanitized_master_path TEXT,
  p_large_path TEXT, p_card_path TEXT, p_thumb_path TEXT, p_sort_order SMALLINT, p_is_cover BOOLEAN,
  p_width INTEGER, p_height INTEGER, p_aspect_ratio NUMERIC, p_mime_type TEXT, p_size_bytes BIGINT
) RETURNS TABLE(media_id UUID, sort_order SMALLINT, is_cover BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_user UUID:=auth.uid(); v_profile UUID; v_path TEXT; v_expected TEXT;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='OT401'; END IF;
  IF p_listing_id IS NULL OR p_media_id IS NULL OR p_sort_order IS NULL OR p_sort_order<0 OR p_is_cover IS NULL OR p_width<=0 OR p_height<=0 OR p_aspect_ratio<=0 OR p_mime_type NOT IN ('image/jpeg','image/png','image/webp') OR p_size_bytes<=0 THEN RAISE EXCEPTION 'invalid sanitized media' USING ERRCODE='OT422'; END IF;
  SELECT vehicle_profile_id INTO v_profile FROM marketplace.listings WHERE id=p_listing_id AND seller_id=v_user AND status='draft' AND moderation_status='pending_review' AND archived_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT vehicle.is_current_profile_owner(v_profile,v_user) THEN RAISE EXCEPTION 'listing not found' USING ERRCODE='OT404'; END IF;
  IF p_temp_path !~ ('^temp/'||v_user::TEXT||'/[0-9a-f-]{36}/[^/]+$') THEN RAISE EXCEPTION 'invalid temporary path' USING ERRCODE='OT403'; END IF;
  IF NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='listing-media' AND name=p_temp_path AND COALESCE(owner_id,owner::TEXT)=v_user::TEXT) THEN RAISE EXCEPTION 'temporary source not found' USING ERRCODE='OT403'; END IF;
  FOREACH v_path IN ARRAY ARRAY[p_sanitized_master_path,p_large_path,p_card_path,p_thumb_path] LOOP
    IF v_path IS NULL OR v_path !~ ('^public/'||v_profile::TEXT||'/'||p_media_id::TEXT||'/(master|large|card|thumb)\\.(webp|jpg|jpeg|png)$') OR NOT EXISTS (SELECT 1 FROM storage.objects WHERE bucket_id='listing-media' AND name=v_path AND owner_id IS NULL) THEN RAISE EXCEPTION 'sanitized derivative not authorized' USING ERRCODE='OT403'; END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM vehicle.profile_media WHERE id=p_media_id) THEN RAISE EXCEPTION 'media identifier conflict' USING ERRCODE='OT409'; END IF;
  IF p_is_cover THEN UPDATE vehicle.profile_media SET is_cover=FALSE WHERE vehicle_profile_id=v_profile AND is_cover; END IF;
  INSERT INTO vehicle.profile_media(id,vehicle_profile_id,storage_path,url,original_path,large_path,card_path,thumb_path,media_type,sort_order,is_cover,width,height,aspect_ratio,mime_type,size_bytes,processed_status,blur_status,privacy_version,sanitized_at)
  VALUES(p_media_id,v_profile,p_large_path,p_large_path,p_sanitized_master_path,p_large_path,p_card_path,p_thumb_path,'image',p_sort_order,p_is_cover,p_width,p_height,p_aspect_ratio,p_mime_type,p_size_bytes,'processed','completed',1,now());
  IF p_is_cover THEN PERFORM public.set_own_listing_cover_media(p_listing_id,p_media_id); END IF;
  RETURN QUERY SELECT p_media_id,p_sort_order,p_is_cover;
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_own_listing_sanitized_photo(UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,SMALLINT,BOOLEAN,INTEGER,INTEGER,NUMERIC,TEXT,BIGINT) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.finalize_own_listing_sanitized_photo(UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,SMALLINT,BOOLEAN,INTEGER,INTEGER,NUMERIC,TEXT,BIGINT) TO authenticated;
COMMENT ON FUNCTION public.finalize_own_listing_sanitized_photo(UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,SMALLINT,BOOLEAN,INTEGER,INTEGER,NUMERIC,TEXT,BIGINT) IS 'MEDIA-SEC-01 owner-derived finalization of trusted-server written sanitized derivatives; temporary originals never become canonical media.';
NOTIFY pgrst, 'reload schema';
COMMIT;
