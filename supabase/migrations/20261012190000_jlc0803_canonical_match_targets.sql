BEGIN;

-- JLC-0803 keeps matching on the public-safe Search v1 projection.  The
-- returned IDs are system-only routing references for a later notification or
-- lead stage; neither buyer criteria nor listing/seller data is exposed here.
CREATE FUNCTION marketplace.list_listing_match_targets_v1(p_listing_id UUID)
RETURNS TABLE (
  target_kind TEXT,
  target_id UUID,
  user_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_seller_id UUID;
  v_target RECORD;
BEGIN
  SELECT listing.seller_id
  INTO v_seller_id
  FROM marketplace.listings AS listing
  WHERE listing.id = p_listing_id;

  IF NOT FOUND OR NOT EXISTS (
    SELECT 1
    FROM marketplace.listing_search_documents AS document
    WHERE document.listing_id = p_listing_id
  ) THEN
    RETURN;
  END IF;

  FOR v_target IN
    SELECT 'buyer_request'::TEXT AS target_kind, request.id AS target_id,
           request.user_id, request.search_request, request.created_at
    FROM marketplace.buyer_requests AS request
    WHERE request.status = 'active'
      AND request.criteria_version = 'v1'
      AND request.search_request IS NOT NULL
      AND request.user_id <> v_seller_id
    UNION ALL
    SELECT 'saved_search'::TEXT AS target_kind, saved.id AS target_id,
           saved.user_id, saved.search_request, saved.created_at
    FROM marketplace.saved_searches AS saved
    WHERE saved.alert_enabled = TRUE
      AND saved.criteria_version = 'v1'
      AND saved.search_request IS NOT NULL
      AND saved.user_id <> v_seller_id
    ORDER BY target_kind, created_at, target_id
  LOOP
    BEGIN
      IF marketplace.listing_matches_search_v1(v_target.search_request, p_listing_id) THEN
        target_kind := v_target.target_kind;
        target_id := v_target.target_id;
        user_id := v_target.user_id;
        RETURN NEXT;
      END IF;
    EXCEPTION WHEN SQLSTATE '22023' THEN
      -- Legacy or malformed criteria must not block a listing lifecycle event
      -- or acquire guessed matching semantics.
      CONTINUE;
    END;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION marketplace.list_listing_match_targets_v1(UUID)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.list_listing_match_targets_v1(UUID)
  TO service_role;

COMMENT ON FUNCTION marketplace.list_listing_match_targets_v1(UUID) IS
  'JLC-0803 system-only deterministic matcher over active buyer requests and alert-enabled saved searches. Uses only canonical Search v1 semantics and the public-safe listing search projection.';

NOTIFY pgrst, 'reload schema';

COMMIT;
