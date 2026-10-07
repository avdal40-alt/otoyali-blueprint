BEGIN;

-- seller_id is an internal ownership identifier. The public facade must not
-- expose it; contact and conversation RPCs resolve and authorize the seller
-- server-side. DROP without CASCADE deliberately stops this migration if an
-- unreviewed database object depends on the existing public contract.
DROP VIEW public.ff_listing_details;

CREATE VIEW public.ff_listing_details
WITH (security_invoker = true)
AS
SELECT
  l.id AS listing_id,
  l.vehicle_profile_id,
  l.title,
  l.description,
  l.price_amount,
  l.currency::TEXT AS currency,
  l.price_negotiable,
  l.city,
  l.published_at,
  ma.name AS make_name,
  mo.name AS model_name,
  vp.year,
  vp.mileage_km,
  vp.fuel_type::TEXT AS fuel_type,
  vp.transmission::TEXT AS transmission,
  cover_media.cover_image_url,
  COALESCE(media_stats.media_count, 0) AS media_count,
  vp.body_type,
  COALESCE(vp.condition, 'used') AS condition,
  l.seller_type,
  vp.drive_type,
  vp.color,
  vp.engine_volume_l,
  vp.damage_state,
  vp.owner_count,
  l.quality_score,
  l.seller_display_name,
  COALESCE(video_stats.video_count, 0) AS video_count
FROM marketplace.listings l
INNER JOIN vehicle.vehicle_profiles vp ON vp.id = l.vehicle_profile_id
INNER JOIN vehicle.makes ma ON ma.id = vp.make_id
INNER JOIN vehicle.models mo ON mo.id = vp.model_id
LEFT JOIN LATERAL (
  SELECT COALESCE(pm.large_url, pm.original_url, pm.url) AS cover_image_url
  FROM vehicle.profile_media pm
  WHERE pm.vehicle_profile_id = vp.id
  ORDER BY (pm.id = l.cover_media_id) DESC, pm.is_cover DESC, pm.sort_order ASC, pm.created_at ASC
  LIMIT 1
) cover_media ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INT AS media_count
  FROM vehicle.profile_media pm
  WHERE pm.vehicle_profile_id = vp.id
) media_stats ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INT AS video_count
  FROM marketplace.listing_videos lv
  WHERE lv.listing_id = l.id
    AND lv.status = 'active'
    AND lv.visibility = 'public'
) video_stats ON TRUE
WHERE l.status = 'active'
  AND l.moderation_status = 'active'
  AND vp.profile_status = 'active'
  AND ma.is_active = TRUE
  AND mo.is_active = TRUE;

COMMENT ON VIEW public.ff_listing_details IS
  'Public read view for active listing details. Exposes seller-safe display metadata only; ownership identifiers remain private.';

GRANT SELECT ON public.ff_listing_details TO anon, authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
