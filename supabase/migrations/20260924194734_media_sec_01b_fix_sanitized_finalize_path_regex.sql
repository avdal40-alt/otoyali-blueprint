CREATE OR REPLACE FUNCTION public.finalize_own_listing_sanitized_photo(p_listing_id uuid,p_media_id uuid,p_temp_path text,p_sanitized_master_path text,p_large_path text,p_card_path text,p_thumb_path text,p_sort_order smallint,p_is_cover boolean,p_width integer,p_height integer,p_aspect_ratio numeric,p_mime_type text,p_size_bytes bigint) RETURNS TABLE(media_id uuid,sort_order smallint,is_cover boolean) LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_catalog AS $$
DECLARE v_user uuid:=auth.uid();v_profile uuid;v_path text;
BEGIN
 IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='OT401';END IF;
 IF p_listing_id IS NULL OR p_media_id IS NULL OR p_sort_order IS NULL OR p_sort_order<0 OR p_is_cover IS NULL OR p_width<=0 OR p_height<=0 OR p_aspect_ratio<=0 OR p_mime_type NOT IN ('image/jpeg','image/png','image/webp') OR p_size_bytes<=0 THEN RAISE EXCEPTION 'invalid sanitized media' USING ERRCODE='OT422';END IF;
 SELECT l.vehicle_profile_id INTO v_profile FROM marketplace.listings l WHERE l.id=p_listing_id AND l.seller_id=v_user AND l.status='draft' AND l.moderation_status='pending_review' AND l.archived_at IS NULL FOR UPDATE;
 IF NOT FOUND OR NOT vehicle.is_current_profile_owner(v_profile,v_user) THEN RAISE EXCEPTION 'listing not found' USING ERRCODE='OT404';END IF;
 IF p_temp_path !~ ('^temp/'||v_user::text||'/[0-9a-f-]{36}/[^/]+$') OR NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='listing-media' AND o.name=p_temp_path AND coalesce(o.owner_id,o.owner::text)=v_user::text) THEN RAISE EXCEPTION 'temporary source not found' USING ERRCODE='OT403';END IF;
 FOREACH v_path IN ARRAY ARRAY[p_sanitized_master_path,p_large_path,p_card_path,p_thumb_path] LOOP
  IF v_path IS NULL OR v_path !~ ('^public/'||v_profile::text||'/'||p_media_id::text||'/(master|large|card|thumb)[.](webp|jpg|jpeg|png)$') OR NOT EXISTS(SELECT 1 FROM storage.objects o WHERE o.bucket_id='listing-media' AND o.name=v_path AND o.owner_id IS NULL) THEN RAISE EXCEPTION 'sanitized derivative not authorized' USING ERRCODE='OT403';END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM vehicle.profile_media pm WHERE pm.id=p_media_id) THEN RAISE EXCEPTION 'media identifier conflict' USING ERRCODE='OT409';END IF;
 IF p_is_cover THEN UPDATE vehicle.profile_media pm SET is_cover=false WHERE pm.vehicle_profile_id=v_profile AND pm.is_cover;END IF;
 INSERT INTO vehicle.profile_media(id,vehicle_profile_id,storage_path,url,original_path,large_path,card_path,thumb_path,media_type,sort_order,is_cover,width,height,aspect_ratio,mime_type,size_bytes,processed_status,blur_status,privacy_version,sanitized_at) VALUES(p_media_id,v_profile,p_large_path,p_large_path,p_sanitized_master_path,p_large_path,p_card_path,p_thumb_path,'image',p_sort_order,p_is_cover,p_width,p_height,p_aspect_ratio,p_mime_type,p_size_bytes,'processed','completed',1,now());
 IF p_is_cover THEN PERFORM public.set_own_listing_cover_media(p_listing_id,p_media_id);END IF; RETURN QUERY SELECT p_media_id,p_sort_order,p_is_cover;
END;$$;
REVOKE ALL ON FUNCTION public.finalize_own_listing_sanitized_photo(uuid,uuid,text,text,text,text,text,smallint,boolean,integer,integer,numeric,text,bigint) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.finalize_own_listing_sanitized_photo(uuid,uuid,text,text,text,text,text,smallint,boolean,integer,integer,numeric,text,bigint) TO authenticated;
