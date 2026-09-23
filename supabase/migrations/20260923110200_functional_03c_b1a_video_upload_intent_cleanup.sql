BEGIN;

CREATE OR REPLACE FUNCTION public.revoke_own_listing_video_upload_intent(
  p_listing_id UUID,
  p_intent_id UUID
)
RETURNS TABLE (object_path TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_intent marketplace.listing_video_upload_intents%ROWTYPE;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  PERFORM 1
  FROM marketplace.listings AS listing
  WHERE listing.id = p_listing_id AND listing.seller_id = v_actor_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  SELECT * INTO v_intent
  FROM marketplace.listing_video_upload_intents AS intent
  WHERE intent.id = p_intent_id
    AND intent.listing_id = p_listing_id
    AND intent.owner_user_id = v_actor_id
    AND intent.consumed_at IS NULL
    AND intent.revoked_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'video upload intent is unavailable' USING ERRCODE = 'OT422';
  END IF;

  UPDATE marketplace.listing_video_upload_intents
  SET revoked_at = NOW()
  WHERE id = v_intent.id AND revoked_at IS NULL AND consumed_at IS NULL;

  RETURN QUERY SELECT v_intent.object_path;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_own_listing_video_upload_intent(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_own_listing_video_upload_intent(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION public.revoke_own_listing_video_upload_intent(UUID, UUID) IS
  'FUNCTIONAL-03C-B1A immediate owner-bound upload-intent revocation for trusted server cleanup. Expired, unconsumed intents may be revoked; consumed or already-revoked intents fail closed.';

NOTIFY pgrst, 'reload schema';
COMMIT;
