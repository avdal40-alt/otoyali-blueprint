BEGIN;

ALTER TABLE marketplace.listings
  ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE marketplace.listings
  ADD CONSTRAINT listings_views_count_nonnegative_chk CHECK (views_count >= 0);

CREATE OR REPLACE VIEW public.ff_home_listings
WITH (security_invoker = true)
AS
SELECT
  l.id AS listing_id,
  l.vehicle_profile_id,
  l.title,
  l.price_amount,
  l.currency::TEXT AS currency,
  l.city,
  l.published_at,
  ma.name AS make_name,
  mo.name AS model_name,
  vp.year,
  vp.mileage_km,
  vp.fuel_type::TEXT AS fuel_type,
  vp.transmission::TEXT AS transmission,
  cover_media.url AS cover_image_url,
  COALESCE(media_stats.media_count, 0) AS media_count,
  l.price_negotiable,
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
  COALESCE(video_stats.video_count, 0) AS video_count,
  l.views_count
FROM marketplace.listings l
INNER JOIN vehicle.vehicle_profiles vp ON vp.id = l.vehicle_profile_id
INNER JOIN vehicle.makes ma ON ma.id = vp.make_id
INNER JOIN vehicle.models mo ON mo.id = vp.model_id
LEFT JOIN LATERAL (
  SELECT pm.url FROM vehicle.profile_media pm
  WHERE pm.vehicle_profile_id = vp.id
  ORDER BY (pm.id = l.cover_media_id) DESC, pm.is_cover DESC, pm.sort_order ASC, pm.created_at ASC
  LIMIT 1
) cover_media ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INT AS media_count FROM vehicle.profile_media pm
  WHERE pm.vehicle_profile_id = vp.id
) media_stats ON TRUE
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INT AS video_count FROM marketplace.listing_videos lv
  WHERE lv.listing_id = l.id AND lv.status = 'active' AND lv.visibility = 'public'
) video_stats ON TRUE
WHERE l.status = 'active' AND l.moderation_status = 'active'
  AND vp.profile_status = 'active' AND ma.is_active = TRUE AND mo.is_active = TRUE;

COMMENT ON VIEW public.ff_home_listings IS
  'Public listing cards expose publication date and aggregate listing views only; private analytics remain inaccessible.';

COMMIT;
