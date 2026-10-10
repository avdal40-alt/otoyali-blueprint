BEGIN;

CREATE OR REPLACE FUNCTION public.remove_own_listing_media(p_listing_id uuid, p_media_id uuid)
RETURNS TABLE(original_path text, storage_path text, large_path text, card_path text, thumb_path text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, marketplace, vehicle, pg_catalog AS $$
DECLARE
  media_record vehicle.profile_media%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;

  SELECT media.* INTO media_record
  FROM vehicle.profile_media media
  JOIN marketplace.listings listing ON listing.vehicle_profile_id = media.vehicle_profile_id
  WHERE media.id = p_media_id
    AND listing.id = p_listing_id
    AND listing.seller_id = auth.uid()
    AND listing.status = 'draft'
    AND listing.moderation_status IN ('pending_review', 'rejected');
  IF NOT FOUND THEN RAISE EXCEPTION 'media is not owned by this seller' USING ERRCODE = 'OT403'; END IF;

  DELETE FROM vehicle.profile_media WHERE id = media_record.id;
  RETURN QUERY SELECT media_record.original_path, media_record.storage_path, media_record.large_path, media_record.card_path, media_record.thumb_path;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_own_listing_media(uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.remove_own_listing_media(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.remove_own_listing_media(uuid, uuid) IS 'Owner-only persisted media removal; returns all canonical paths for best-effort storage cleanup.';
NOTIFY pgrst, 'reload schema';
COMMIT;
