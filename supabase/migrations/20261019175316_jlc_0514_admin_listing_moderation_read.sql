BEGIN;

CREATE OR REPLACE FUNCTION public.admin_list_listing_moderation(
  p_moderation_status TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  listing_id UUID,
  title TEXT,
  status TEXT,
  moderation_status TEXT,
  price_amount BIGINT,
  currency TEXT,
  city TEXT,
  seller_type TEXT,
  quality_score SMALLINT,
  created_at TIMESTAMPTZ,
  make_name TEXT,
  model_name TEXT,
  year SMALLINT,
  preview_path TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  IF NOT public.is_admin(v_user_id) THEN
    RAISE EXCEPTION 'admin authorization required' USING ERRCODE = 'OT403';
  END IF;

  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'invalid moderation listing limit' USING ERRCODE = 'OT422';
  END IF;

  IF p_moderation_status IS NOT NULL
     AND p_moderation_status NOT IN ('pending_review', 'active', 'rejected', 'archived') THEN
    RAISE EXCEPTION 'invalid moderation listing filter' USING ERRCODE = 'OT422';
  END IF;

  RETURN QUERY
  SELECT
    listing.id,
    listing.title,
    listing.status::TEXT,
    listing.moderation_status,
    listing.price_amount,
    listing.currency::TEXT,
    listing.city,
    listing.seller_type,
    listing.quality_score,
    listing.created_at,
    make.name,
    model.name,
    vehicle_profile.year,
    preview.thumb_path
  FROM marketplace.listings AS listing
  LEFT JOIN vehicle.vehicle_profiles AS vehicle_profile
    ON vehicle_profile.id = listing.vehicle_profile_id
  LEFT JOIN vehicle.makes AS make
    ON make.id = vehicle_profile.make_id
  LEFT JOIN vehicle.models AS model
    ON model.id = vehicle_profile.model_id
  LEFT JOIN LATERAL (
    SELECT media.thumb_path
    FROM vehicle.profile_media AS media
    WHERE media.vehicle_profile_id = listing.vehicle_profile_id
      AND media.processed_status = 'processed'
      AND media.blur_status = 'blurred'
      AND media.thumb_path ~ ('^public/' || listing.vehicle_profile_id::TEXT || '/' || media.id::TEXT || '/thumb[.](webp|jpg|jpeg|png)$')
    ORDER BY (media.id = listing.cover_media_id) DESC, media.is_cover DESC,
      media.sort_order ASC, media.created_at ASC, media.id ASC
    LIMIT 1
  ) AS preview ON TRUE
  WHERE p_moderation_status IS NULL OR listing.moderation_status = p_moderation_status
  ORDER BY listing.created_at DESC, listing.id DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_listing_moderation(TEXT, INTEGER) FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_listing_moderation(TEXT, INTEGER) TO authenticated;

COMMIT;
