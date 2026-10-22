BEGIN;

-- JLC-0521: This deployment is the Jolmod Kazakhstan public market. The
-- canonical market discriminator is the listing city; no caller input or UI
-- locale participates in this decision. Historical TR rows remain intact.

CREATE OR REPLACE FUNCTION marketplace.is_jolmod_kazakhstan_city(p_city_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = marketplace, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM marketplace.cities AS city
    WHERE city.id = p_city_id AND city.country_code = 'KZ'
  );
$$;
REVOKE ALL ON FUNCTION marketplace.is_jolmod_kazakhstan_city(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.is_jolmod_kazakhstan_city(UUID) TO anon, authenticated, service_role;

ALTER POLICY listing_search_documents_select_public
  ON marketplace.listing_search_documents
  TO anon, authenticated
  USING (
    marketplace.is_jolmod_kazakhstan_city(listing_search_documents.city_id)
  );

-- The matcher is also used by SECURITY DEFINER notification workflows. Its
-- country predicate makes those workflows fail closed even when their caller
-- bypasses ordinary table RLS.
CREATE OR REPLACE FUNCTION marketplace.search_listing_document_matches_v1(
  p_semantics marketplace.search_listings_v1_semantics,
  p_document marketplace.listing_search_documents
)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = marketplace, pg_catalog
AS $$
BEGIN
  IF NOT marketplace.is_jolmod_kazakhstan_city(p_document.city_id) THEN
    RETURN FALSE;
  END IF;

  RETURN (cardinality(p_semantics.make_ids) = 0 OR p_document.make_id = ANY(p_semantics.make_ids))
    AND (cardinality(p_semantics.model_ids) = 0 OR p_document.model_id = ANY(p_semantics.model_ids))
    AND (cardinality(p_semantics.variant_ids) = 0 OR p_document.variant_id = ANY(p_semantics.variant_ids))
    AND (cardinality(p_semantics.city_ids) = 0 OR p_document.city_id = ANY(p_semantics.city_ids))
    AND (cardinality(p_semantics.district_ids) = 0 OR p_document.district_id = ANY(p_semantics.district_ids))
    AND (p_semantics.condition IS NULL OR p_document.condition = p_semantics.condition)
    AND (p_semantics.price_min IS NULL OR p_document.price_amount >= p_semantics.price_min)
    AND (p_semantics.price_max IS NULL OR p_document.price_amount <= p_semantics.price_max)
    AND (p_semantics.year_min IS NULL OR p_document.year >= p_semantics.year_min)
    AND (p_semantics.year_max IS NULL OR p_document.year <= p_semantics.year_max)
    AND (p_semantics.mileage_min IS NULL OR p_document.mileage_km >= p_semantics.mileage_min)
    AND (p_semantics.mileage_max IS NULL OR p_document.mileage_km <= p_semantics.mileage_max)
    AND (cardinality(p_semantics.fuel_types) = 0 OR p_document.fuel_type = ANY(p_semantics.fuel_types))
    AND (cardinality(p_semantics.transmissions) = 0 OR p_document.transmission = ANY(p_semantics.transmissions))
    AND (cardinality(p_semantics.body_types) = 0 OR p_document.body_type = ANY(p_semantics.body_types))
    AND (cardinality(p_semantics.drive_types) = 0 OR p_document.drive_type = ANY(p_semantics.drive_types))
    AND (cardinality(p_semantics.colors) = 0 OR p_document.color = ANY(p_semantics.colors))
    AND (cardinality(p_semantics.seller_types) = 0 OR p_document.seller_type = ANY(p_semantics.seller_types))
    AND (p_semantics.engine_volume_min IS NULL OR p_document.engine_volume_l >= p_semantics.engine_volume_min)
    AND (p_semantics.engine_volume_max IS NULL OR p_document.engine_volume_l <= p_semantics.engine_volume_max)
    AND (p_semantics.power_kw_min IS NULL OR p_document.power_kw >= p_semantics.power_kw_min)
    AND (p_semantics.power_kw_max IS NULL OR p_document.power_kw <= p_semantics.power_kw_max)
    AND (p_semantics.battery_capacity_kwh_min IS NULL OR p_document.battery_capacity_kwh >= p_semantics.battery_capacity_kwh_min)
    AND (p_semantics.battery_capacity_kwh_max IS NULL OR p_document.battery_capacity_kwh <= p_semantics.battery_capacity_kwh_max)
    AND (p_semantics.electric_range_km_min IS NULL OR p_document.electric_range_km >= p_semantics.electric_range_km_min)
    AND (p_semantics.electric_range_km_max IS NULL OR p_document.electric_range_km <= p_semantics.electric_range_km_max)
    AND (cardinality(p_semantics.service_declarations) = 0 OR p_document.seller_service_declaration = ANY(p_semantics.service_declarations))
    AND (cardinality(p_semantics.damage_declarations) = 0 OR p_document.seller_damage_declaration = ANY(p_semantics.damage_declarations))
    AND (p_semantics.trade_in_accepted IS NULL OR p_document.trade_in_accepted = p_semantics.trade_in_accepted)
    AND (p_semantics.price_negotiable IS NULL OR p_document.price_negotiable = p_semantics.price_negotiable)
    AND (p_semantics.has_photos IS NULL OR (p_document.photo_count > 0) = p_semantics.has_photos)
    AND (p_semantics.has_video IS NULL OR p_document.has_video = p_semantics.has_video)
    AND (p_semantics.query IS NULL OR concat_ws(' ', p_document.make_name, p_document.model_name, p_document.variant_name, p_document.city_name, p_document.district_name) ILIKE '%' || replace(replace(replace(p_semantics.query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' ESCAPE E'\\');
END;
$$;

CREATE OR REPLACE VIEW public.ff_home_listings WITH (security_invoker = true) AS
SELECT l.id AS listing_id,l.vehicle_profile_id,l.title,l.price_amount,l.currency::text AS currency,l.city,l.published_at,ma.name AS make_name,mo.name AS model_name,vp.year,vp.mileage_km,vp.fuel_type::text AS fuel_type,vp.transmission::text AS transmission,cover_media.url AS cover_image_url,COALESCE(media_stats.media_count,0) AS media_count,l.price_negotiable,vp.body_type,COALESCE(vp.condition,'used'::text) AS condition,l.seller_type,vp.drive_type,vp.color,vp.engine_volume_l,vp.damage_state,vp.owner_count,l.quality_score,l.seller_display_name,COALESCE(video_stats.video_count,0) AS video_count,l.views_count,COALESCE(l.raised_at,l.published_at) AS ranking_freshness_at
FROM marketplace.listings l
JOIN marketplace.cities city ON city.id = l.city_id AND city.country_code = 'KZ'
JOIN vehicle.vehicle_profiles vp ON vp.id=l.vehicle_profile_id JOIN vehicle.makes ma ON ma.id=vp.make_id JOIN vehicle.models mo ON mo.id=vp.model_id LEFT JOIN LATERAL(SELECT COALESCE(pm.card_url,pm.large_url,pm.url) AS url FROM vehicle.profile_media pm WHERE pm.vehicle_profile_id=vp.id ORDER BY (pm.id=l.cover_media_id) DESC,pm.is_cover DESC,pm.sort_order,pm.created_at LIMIT 1) cover_media ON true LEFT JOIN LATERAL(SELECT count(*)::integer AS media_count FROM vehicle.profile_media pm WHERE pm.vehicle_profile_id=vp.id) media_stats ON true LEFT JOIN LATERAL(SELECT count(*)::integer AS video_count FROM marketplace.listing_videos lv WHERE lv.listing_id=l.id AND lv.status='active' AND lv.visibility='public') video_stats ON true
WHERE l.status='active' AND l.moderation_status='active' AND vp.profile_status='active' AND ma.is_active AND mo.is_active;

CREATE OR REPLACE VIEW public.ff_listing_details WITH (security_invoker = true) AS
SELECT l.id AS listing_id,l.vehicle_profile_id,l.title,l.description,l.price_amount,l.currency::text AS currency,l.price_negotiable,l.city,l.published_at,ma.name AS make_name,mo.name AS model_name,vp.year,vp.mileage_km,vp.fuel_type::text AS fuel_type,vp.transmission::text AS transmission,cover_media.cover_image_url,COALESCE(media_stats.media_count,0) AS media_count,vp.body_type,COALESCE(vp.condition,'used') AS condition,l.seller_type,vp.drive_type,vp.color,vp.engine_volume_l,vp.damage_state,vp.owner_count,l.quality_score,l.seller_display_name,COALESCE(video_stats.video_count,0) AS video_count
FROM marketplace.listings l
JOIN marketplace.cities city ON city.id = l.city_id AND city.country_code = 'KZ'
JOIN vehicle.vehicle_profiles vp ON vp.id=l.vehicle_profile_id JOIN vehicle.makes ma ON ma.id=vp.make_id JOIN vehicle.models mo ON mo.id=vp.model_id LEFT JOIN LATERAL(SELECT COALESCE(pm.large_url,pm.original_url,pm.url) AS cover_image_url FROM vehicle.profile_media pm WHERE pm.vehicle_profile_id=vp.id ORDER BY (pm.id=l.cover_media_id) DESC,pm.is_cover DESC,pm.sort_order ASC,pm.created_at ASC LIMIT 1) cover_media ON TRUE LEFT JOIN LATERAL(SELECT COUNT(*)::INT AS media_count FROM vehicle.profile_media pm WHERE pm.vehicle_profile_id=vp.id) media_stats ON TRUE LEFT JOIN LATERAL(SELECT COUNT(*)::INT AS video_count FROM marketplace.listing_videos lv WHERE lv.listing_id=l.id AND lv.status='active' AND lv.visibility='public') video_stats ON TRUE
WHERE l.status='active' AND l.moderation_status='active' AND vp.profile_status='active' AND ma.is_active AND mo.is_active;

REVOKE ALL ON FUNCTION marketplace.search_listing_document_matches_v1(marketplace.search_listings_v1_semantics, marketplace.listing_search_documents) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.search_listing_document_matches_v1(marketplace.search_listings_v1_semantics, marketplace.listing_search_documents) TO anon, authenticated, service_role;

COMMENT ON FUNCTION marketplace.search_listing_document_matches_v1(marketplace.search_listings_v1_semantics, marketplace.listing_search_documents) IS 'JLC-0521 canonical KZ-only search predicate. It rejects every projection whose trusted city is not Kazakhstan.';
NOTIFY pgrst, 'reload schema';
COMMIT;
