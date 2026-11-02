BEGIN;

-- Category details stay private as a base table. This narrow definer helper
-- exposes only fields already suitable for a public active KZ listing and
-- prevents the security-invoker public views from requiring direct table
-- privileges for anon/authenticated roles.
CREATE FUNCTION marketplace.public_listing_category_details(p_listing_id UUID)
RETURNS TABLE(
  truck_body_type TEXT, bus_type TEXT, trailer_type TEXT, machinery_type TEXT,
  payload_capacity_kg INTEGER, gross_weight_kg INTEGER, axle_count SMALLINT,
  seat_count SMALLINT, operating_hours INTEGER
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = marketplace, pg_catalog
AS $$
  SELECT d.truck_body_type,d.bus_type,d.trailer_type,d.machinery_type,
    d.payload_capacity_kg,d.gross_weight_kg,d.axle_count,d.seat_count,d.operating_hours
  FROM marketplace.listing_vehicle_category_details d
  JOIN marketplace.listings l ON l.id=d.listing_id
  JOIN marketplace.cities c ON c.id=l.city_id
  WHERE d.listing_id=p_listing_id
    AND l.status='active' AND l.moderation_status='active'
    AND c.country_code='KZ' AND c.is_active;
$$;

REVOKE ALL ON FUNCTION marketplace.public_listing_category_details(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.public_listing_category_details(UUID) TO anon, authenticated;

CREATE OR REPLACE VIEW public.ff_home_listings WITH (security_invoker = true) AS
SELECT l.id AS listing_id,l.vehicle_profile_id,l.title,l.price_amount,l.currency::text AS currency,l.city,l.published_at,ma.name AS make_name,mo.name AS model_name,vp.year,vp.mileage_km,vp.fuel_type::text AS fuel_type,vp.transmission::text AS transmission,cover_media.url AS cover_image_url,COALESCE(media_stats.media_count,0) AS media_count,l.price_negotiable,vp.body_type,COALESCE(vp.condition,'used'::text) AS condition,l.seller_type,vp.drive_type,vp.color,vp.engine_volume_l,vp.damage_state,vp.owner_count,l.quality_score,l.seller_display_name,COALESCE(video_stats.video_count,0) AS video_count,l.views_count,COALESCE(l.raised_at,l.published_at) AS ranking_freshness_at,l.vehicle_category::text,l.listing_purpose::text,l.rental_price_per_day,l.rental_price_per_month,l.minimum_rental_days,l.security_deposit_amount,l.with_driver_or_operator,details.truck_body_type,details.bus_type,details.trailer_type,details.machinery_type,details.payload_capacity_kg,details.gross_weight_kg,details.axle_count,details.seat_count,details.operating_hours
FROM marketplace.listings l
JOIN marketplace.cities city ON city.id = l.city_id AND city.country_code = 'KZ'
JOIN vehicle.vehicle_profiles vp ON vp.id=l.vehicle_profile_id
LEFT JOIN vehicle.makes ma ON ma.id=vp.make_id
LEFT JOIN vehicle.models mo ON mo.id=vp.model_id
LEFT JOIN LATERAL marketplace.public_listing_category_details(l.id) details ON true
LEFT JOIN LATERAL(SELECT COALESCE(pm.card_url,pm.large_url,pm.url) AS url FROM vehicle.profile_media pm WHERE pm.vehicle_profile_id=vp.id ORDER BY (pm.id=l.cover_media_id) DESC,pm.is_cover DESC,pm.sort_order,pm.created_at LIMIT 1) cover_media ON true
LEFT JOIN LATERAL(SELECT count(*)::integer AS media_count FROM vehicle.profile_media pm WHERE pm.vehicle_profile_id=vp.id) media_stats ON true
LEFT JOIN LATERAL(SELECT count(*)::integer AS video_count FROM marketplace.listing_videos lv WHERE lv.listing_id=l.id AND lv.status='active' AND lv.visibility='public') video_stats ON true
WHERE l.status='active' AND l.moderation_status='active' AND vp.profile_status='active' AND (l.vehicle_category <> 'passenger_car' OR (ma.is_active AND mo.is_active));

CREATE OR REPLACE VIEW public.ff_listing_details WITH (security_invoker = true) AS
SELECT l.id AS listing_id,l.vehicle_profile_id,l.title,l.description,l.price_amount,l.currency::text AS currency,l.price_negotiable,l.city,l.published_at,ma.name AS make_name,mo.name AS model_name,vp.year,vp.mileage_km,vp.fuel_type::text AS fuel_type,vp.transmission::text AS transmission,cover_media.cover_image_url,COALESCE(media_stats.media_count,0) AS media_count,vp.body_type,COALESCE(vp.condition,'used') AS condition,l.seller_type,vp.drive_type,vp.color,vp.engine_volume_l,vp.damage_state,vp.owner_count,l.quality_score,l.seller_display_name,COALESCE(video_stats.video_count,0) AS video_count,l.vehicle_category::text,l.listing_purpose::text,l.rental_price_per_day,l.rental_price_per_month,l.minimum_rental_days,l.security_deposit_amount,l.with_driver_or_operator,details.truck_body_type,details.bus_type,details.trailer_type,details.machinery_type,details.payload_capacity_kg,details.gross_weight_kg,details.axle_count,details.seat_count,details.operating_hours
FROM marketplace.listings l
JOIN marketplace.cities city ON city.id = l.city_id AND city.country_code = 'KZ'
JOIN vehicle.vehicle_profiles vp ON vp.id=l.vehicle_profile_id
LEFT JOIN vehicle.makes ma ON ma.id=vp.make_id
LEFT JOIN vehicle.models mo ON mo.id=vp.model_id
LEFT JOIN LATERAL marketplace.public_listing_category_details(l.id) details ON true
LEFT JOIN LATERAL(SELECT COALESCE(pm.large_url,pm.original_url,pm.url) AS cover_image_url FROM vehicle.profile_media pm WHERE pm.vehicle_profile_id=vp.id ORDER BY (pm.id=l.cover_media_id) DESC,pm.is_cover DESC,pm.sort_order ASC,pm.created_at ASC LIMIT 1) cover_media ON TRUE
LEFT JOIN LATERAL(SELECT COUNT(*)::INT AS media_count FROM vehicle.profile_media pm WHERE pm.vehicle_profile_id=vp.id) media_stats ON TRUE
LEFT JOIN LATERAL(SELECT COUNT(*)::INT AS video_count FROM marketplace.listing_videos lv WHERE lv.listing_id=l.id AND lv.status='active' AND lv.visibility='public') video_stats ON TRUE
WHERE l.status='active' AND l.moderation_status='active' AND vp.profile_status='active' AND (l.vehicle_category <> 'passenger_car' OR (ma.is_active AND mo.is_active));

NOTIFY pgrst, 'reload schema';
COMMIT;
