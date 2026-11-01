BEGIN;

-- V2 keeps the established public projection and KZ-city boundary. A
-- non-passenger listing may deliberately omit the passenger make/model
-- catalog; passenger cars still require active catalog rows.
ALTER TABLE marketplace.listing_search_documents
  ALTER COLUMN price_amount DROP NOT NULL,
  ADD COLUMN vehicle_category marketplace.vehicle_category NOT NULL DEFAULT 'passenger_car',
  ADD COLUMN listing_purpose marketplace.listing_purpose NOT NULL DEFAULT 'sale',
  ADD COLUMN rental_price_per_day BIGINT,
  ADD COLUMN rental_price_per_month BIGINT,
  ADD COLUMN minimum_rental_days INTEGER,
  ADD COLUMN security_deposit_amount BIGINT,
  ADD COLUMN with_driver_or_operator BOOLEAN,
  ADD COLUMN truck_body_type TEXT,
  ADD COLUMN bus_type TEXT,
  ADD COLUMN trailer_type TEXT,
  ADD COLUMN machinery_type TEXT,
  ADD COLUMN payload_capacity_kg INTEGER,
  ADD COLUMN gross_weight_kg INTEGER,
  ADD COLUMN axle_count SMALLINT,
  ADD COLUMN seat_count SMALLINT,
  ADD COLUMN operating_hours INTEGER;

CREATE INDEX listing_search_documents_v2_category_purpose_idx
  ON marketplace.listing_search_documents (vehicle_category, listing_purpose, city_id, listing_id);

CREATE OR REPLACE FUNCTION marketplace.is_listing_search_eligible(p_listing_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = marketplace, vehicle, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM marketplace.listings AS listing
    JOIN vehicle.vehicle_profiles AS profile ON profile.id = listing.vehicle_profile_id
    LEFT JOIN vehicle.makes AS make ON make.id = profile.make_id
    LEFT JOIN vehicle.models AS model ON model.id = profile.model_id
    WHERE listing.id = p_listing_id
      AND listing.status = 'active'
      AND listing.moderation_status = 'active'
      AND listing.archived_at IS NULL
      AND profile.profile_status = 'active'
      AND (
        listing.vehicle_category <> 'passenger_car'
        OR (make.is_active = TRUE AND model.is_active = TRUE)
      )
      AND (make.id IS NULL OR make.is_active = TRUE)
      AND (model.id IS NULL OR model.is_active = TRUE)
  );
$$;
REVOKE ALL ON FUNCTION marketplace.is_listing_search_eligible(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION marketplace.is_listing_search_eligible(UUID) TO service_role;

CREATE OR REPLACE FUNCTION marketplace.refresh_listing_search_document(p_listing_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = marketplace, vehicle, pg_catalog AS $$
BEGIN
  IF NOT marketplace.is_listing_search_eligible(p_listing_id) THEN
    DELETE FROM marketplace.listing_search_documents WHERE listing_id = p_listing_id;
    RETURN;
  END IF;

  INSERT INTO marketplace.listing_search_documents (
    listing_id,make_id,model_id,variant_id,make_name,model_name,variant_name,condition,year,mileage_km,fuel_type,transmission,body_type,drive_type,color,engine_volume_l,power_kw,battery_capacity_kwh,electric_range_km,seller_service_declaration,seller_damage_declaration,price_amount,currency,price_negotiable,trade_in_accepted,city_id,district_id,city_name,district_name,seller_type,cover_image_url,photo_count,has_video,published_at,raised_at,projected_at,
    vehicle_category,listing_purpose,rental_price_per_day,rental_price_per_month,minimum_rental_days,security_deposit_amount,with_driver_or_operator,truck_body_type,bus_type,trailer_type,machinery_type,payload_capacity_kg,gross_weight_kg,axle_count,seat_count,operating_hours
  )
  SELECT l.id,vp.make_id,vp.model_id,vp.variant_id,ma.name,mo.name,va.name,vp.condition::text,vp.year,vp.mileage_km,vp.fuel_type::text,vp.transmission::text,vp.body_type,vp.drive_type,vp.color,vp.engine_volume_l,vp.power_kw,vp.battery_capacity_kwh,vp.electric_range_km,vp.seller_service_declaration::text,vp.seller_damage_declaration::text,l.price_amount,l.currency,l.price_negotiable,l.trade_in_accepted,l.city_id,l.district_id,ci.name,di.name,l.seller_type,cm.url,coalesce(mc.n,0),EXISTS (SELECT 1 FROM marketplace.listing_videos AS video WHERE video.listing_id=l.id AND marketplace.is_listing_video_publicly_eligible(video.id)),l.published_at,l.raised_at,now(),
    l.vehicle_category,l.listing_purpose,l.rental_price_per_day,l.rental_price_per_month,l.minimum_rental_days,l.security_deposit_amount,l.with_driver_or_operator,details.truck_body_type,details.bus_type,details.trailer_type,details.machinery_type,details.payload_capacity_kg,details.gross_weight_kg,details.axle_count,details.seat_count,details.operating_hours
  FROM marketplace.listings l
  JOIN vehicle.vehicle_profiles vp ON vp.id=l.vehicle_profile_id
  LEFT JOIN vehicle.makes ma ON ma.id=vp.make_id
  LEFT JOIN vehicle.models mo ON mo.id=vp.model_id
  LEFT JOIN vehicle.variants va ON va.id=vp.variant_id
  LEFT JOIN marketplace.cities ci ON ci.id=l.city_id
  LEFT JOIN marketplace.districts di ON di.id=l.district_id
  LEFT JOIN marketplace.listing_vehicle_category_details details ON details.listing_id=l.id
  LEFT JOIN LATERAL(SELECT url FROM vehicle.profile_media WHERE vehicle_profile_id=vp.id ORDER BY is_cover DESC,sort_order LIMIT 1) cm ON true
  LEFT JOIN LATERAL(SELECT count(*)::int n FROM vehicle.profile_media WHERE vehicle_profile_id=vp.id) mc ON true
  WHERE l.id=p_listing_id
  ON CONFLICT(listing_id) DO UPDATE SET
    make_id=EXCLUDED.make_id,model_id=EXCLUDED.model_id,variant_id=EXCLUDED.variant_id,make_name=EXCLUDED.make_name,model_name=EXCLUDED.model_name,variant_name=EXCLUDED.variant_name,condition=EXCLUDED.condition,year=EXCLUDED.year,mileage_km=EXCLUDED.mileage_km,fuel_type=EXCLUDED.fuel_type,transmission=EXCLUDED.transmission,body_type=EXCLUDED.body_type,drive_type=EXCLUDED.drive_type,color=EXCLUDED.color,engine_volume_l=EXCLUDED.engine_volume_l,price_amount=EXCLUDED.price_amount,currency=EXCLUDED.currency,price_negotiable=EXCLUDED.price_negotiable,city_id=EXCLUDED.city_id,district_id=EXCLUDED.district_id,city_name=EXCLUDED.city_name,district_name=EXCLUDED.district_name,seller_type=EXCLUDED.seller_type,cover_image_url=EXCLUDED.cover_image_url,photo_count=EXCLUDED.photo_count,has_video=EXCLUDED.has_video,published_at=EXCLUDED.published_at,raised_at=EXCLUDED.raised_at,projected_at=EXCLUDED.projected_at,
    vehicle_category=EXCLUDED.vehicle_category,listing_purpose=EXCLUDED.listing_purpose,rental_price_per_day=EXCLUDED.rental_price_per_day,rental_price_per_month=EXCLUDED.rental_price_per_month,minimum_rental_days=EXCLUDED.minimum_rental_days,security_deposit_amount=EXCLUDED.security_deposit_amount,with_driver_or_operator=EXCLUDED.with_driver_or_operator,truck_body_type=EXCLUDED.truck_body_type,bus_type=EXCLUDED.bus_type,trailer_type=EXCLUDED.trailer_type,machinery_type=EXCLUDED.machinery_type,payload_capacity_kg=EXCLUDED.payload_capacity_kg,gross_weight_kg=EXCLUDED.gross_weight_kg,axle_count=EXCLUDED.axle_count,seat_count=EXCLUDED.seat_count,operating_hours=EXCLUDED.operating_hours;
END;
$$;
REVOKE ALL ON FUNCTION marketplace.refresh_listing_search_document(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION marketplace.refresh_listing_search_document(UUID) TO service_role;

CREATE OR REPLACE FUNCTION marketplace.sync_listing_search_document_lifecycle()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = marketplace, pg_catalog AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.moderation_status IS DISTINCT FROM NEW.moderation_status
     OR OLD.price_amount IS DISTINCT FROM NEW.price_amount OR OLD.raised_at IS DISTINCT FROM NEW.raised_at
     OR OLD.vehicle_category IS DISTINCT FROM NEW.vehicle_category OR OLD.listing_purpose IS DISTINCT FROM NEW.listing_purpose
     OR OLD.rental_price_per_day IS DISTINCT FROM NEW.rental_price_per_day OR OLD.rental_price_per_month IS DISTINCT FROM NEW.rental_price_per_month
     OR OLD.minimum_rental_days IS DISTINCT FROM NEW.minimum_rental_days OR OLD.security_deposit_amount IS DISTINCT FROM NEW.security_deposit_amount
     OR OLD.with_driver_or_operator IS DISTINCT FROM NEW.with_driver_or_operator THEN
    PERFORM marketplace.refresh_listing_search_document(NEW.id);
    IF EXISTS (SELECT 1 FROM marketplace.listing_search_documents WHERE listing_id = NEW.id) THEN
      IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.moderation_status IS DISTINCT FROM NEW.moderation_status THEN
        PERFORM marketplace.generate_saved_search_alerts_for_listing(NEW.id);
      END IF;
      IF TG_OP = 'UPDATE' AND NEW.price_amount < OLD.price_amount AND NEW.status = 'active' AND NEW.moderation_status = 'active' THEN
        PERFORM marketplace.generate_price_drop_alerts_for_listing(NEW.id);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE VIEW public.ff_home_listings WITH (security_invoker = true) AS
SELECT l.id AS listing_id,l.vehicle_profile_id,l.title,l.price_amount,l.currency::text AS currency,l.city,l.published_at,ma.name AS make_name,mo.name AS model_name,vp.year,vp.mileage_km,vp.fuel_type::text AS fuel_type,vp.transmission::text AS transmission,cover_media.url AS cover_image_url,COALESCE(media_stats.media_count,0) AS media_count,l.price_negotiable,vp.body_type,COALESCE(vp.condition,'used'::text) AS condition,l.seller_type,vp.drive_type,vp.color,vp.engine_volume_l,vp.damage_state,vp.owner_count,l.quality_score,l.seller_display_name,COALESCE(video_stats.video_count,0) AS video_count,l.views_count,COALESCE(l.raised_at,l.published_at) AS ranking_freshness_at,l.vehicle_category::text,l.listing_purpose::text,l.rental_price_per_day,l.rental_price_per_month,l.minimum_rental_days,l.security_deposit_amount,l.with_driver_or_operator
FROM marketplace.listings l
JOIN marketplace.cities city ON city.id = l.city_id AND city.country_code = 'KZ'
JOIN vehicle.vehicle_profiles vp ON vp.id=l.vehicle_profile_id
LEFT JOIN vehicle.makes ma ON ma.id=vp.make_id
LEFT JOIN vehicle.models mo ON mo.id=vp.model_id
LEFT JOIN LATERAL(SELECT COALESCE(pm.card_url,pm.large_url,pm.url) AS url FROM vehicle.profile_media pm WHERE pm.vehicle_profile_id=vp.id ORDER BY (pm.id=l.cover_media_id) DESC,pm.is_cover DESC,pm.sort_order,pm.created_at LIMIT 1) cover_media ON true
LEFT JOIN LATERAL(SELECT count(*)::integer AS media_count FROM vehicle.profile_media pm WHERE pm.vehicle_profile_id=vp.id) media_stats ON true
LEFT JOIN LATERAL(SELECT count(*)::integer AS video_count FROM marketplace.listing_videos lv WHERE lv.listing_id=l.id AND lv.status='active' AND lv.visibility='public') video_stats ON true
WHERE l.status='active' AND l.moderation_status='active' AND vp.profile_status='active' AND (l.vehicle_category <> 'passenger_car' OR (ma.is_active AND mo.is_active));

CREATE OR REPLACE VIEW public.ff_listing_details WITH (security_invoker = true) AS
SELECT l.id AS listing_id,l.vehicle_profile_id,l.title,l.description,l.price_amount,l.currency::text AS currency,l.price_negotiable,l.city,l.published_at,ma.name AS make_name,mo.name AS model_name,vp.year,vp.mileage_km,vp.fuel_type::text AS fuel_type,vp.transmission::text AS transmission,cover_media.cover_image_url,COALESCE(media_stats.media_count,0) AS media_count,vp.body_type,COALESCE(vp.condition,'used') AS condition,l.seller_type,vp.drive_type,vp.color,vp.engine_volume_l,vp.damage_state,vp.owner_count,l.quality_score,l.seller_display_name,COALESCE(video_stats.video_count,0) AS video_count,l.vehicle_category::text,l.listing_purpose::text,l.rental_price_per_day,l.rental_price_per_month,l.minimum_rental_days,l.security_deposit_amount,l.with_driver_or_operator
FROM marketplace.listings l
JOIN marketplace.cities city ON city.id = l.city_id AND city.country_code = 'KZ'
JOIN vehicle.vehicle_profiles vp ON vp.id=l.vehicle_profile_id
LEFT JOIN vehicle.makes ma ON ma.id=vp.make_id
LEFT JOIN vehicle.models mo ON mo.id=vp.model_id
LEFT JOIN LATERAL(SELECT COALESCE(pm.large_url,pm.original_url,pm.url) AS cover_image_url FROM vehicle.profile_media pm WHERE pm.vehicle_profile_id=vp.id ORDER BY (pm.id=l.cover_media_id) DESC,pm.is_cover DESC,pm.sort_order ASC,pm.created_at ASC LIMIT 1) cover_media ON TRUE
LEFT JOIN LATERAL(SELECT COUNT(*)::INT AS media_count FROM vehicle.profile_media pm WHERE pm.vehicle_profile_id=vp.id) media_stats ON TRUE
LEFT JOIN LATERAL(SELECT COUNT(*)::INT AS video_count FROM marketplace.listing_videos lv WHERE lv.listing_id=l.id AND lv.status='active' AND lv.visibility='public') video_stats ON TRUE
WHERE l.status='active' AND l.moderation_status='active' AND vp.profile_status='active' AND (l.vehicle_category <> 'passenger_car' OR (ma.is_active AND mo.is_active));

-- Keep the single existing search engine. Rental rows use the daily price for
-- the established generic price range/sort semantics; sale rows are unchanged.
ALTER FUNCTION marketplace.normalize_search_listings_v1_semantics(JSONB)
  RENAME TO normalize_search_listings_v1_semantics_legacy;

CREATE FUNCTION marketplace.normalize_search_listings_v1_semantics(p_request JSONB)
RETURNS marketplace.search_listings_v1_semantics
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = marketplace, pg_catalog
AS $$
DECLARE v_filters JSONB := COALESCE(p_request -> 'filters', '{}'::JSONB); v_value TEXT;
BEGIN
  IF jsonb_typeof(v_filters) <> 'object' THEN RAISE EXCEPTION 'search filters are invalid' USING ERRCODE='22023'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_each(v_filters) AS item(key,value) WHERE key IN ('vehicle_categories','listing_purposes') AND jsonb_typeof(value) <> 'array')
     OR EXISTS (SELECT 1 FROM jsonb_each(v_filters) AS item(key,value) WHERE key IN ('rental_price_day_min','rental_price_day_max','minimum_rental_days') AND (jsonb_typeof(value) <> 'number' OR value::text !~ '^[0-9]+$'))
     OR (v_filters ? 'with_driver_or_operator' AND jsonb_typeof(v_filters -> 'with_driver_or_operator') <> 'boolean') THEN
    RAISE EXCEPTION 'search filter values are invalid' USING ERRCODE='22023';
  END IF;
  FOR v_value IN SELECT value FROM jsonb_array_elements_text(COALESCE(v_filters -> 'vehicle_categories','[]'::JSONB)) AS value LOOP
    IF v_value NOT IN ('passenger_car','truck','bus','trailer','special_machinery') THEN RAISE EXCEPTION 'search filter values are invalid' USING ERRCODE='22023'; END IF;
  END LOOP;
  FOR v_value IN SELECT value FROM jsonb_array_elements_text(COALESCE(v_filters -> 'listing_purposes','[]'::JSONB)) AS value LOOP
    IF v_value NOT IN ('sale','rent') THEN RAISE EXCEPTION 'search filter values are invalid' USING ERRCODE='22023'; END IF;
  END LOOP;
  IF (v_filters ? 'rental_price_day_min' AND v_filters ? 'rental_price_day_max' AND (v_filters ->> 'rental_price_day_min')::BIGINT > (v_filters ->> 'rental_price_day_max')::BIGINT) THEN RAISE EXCEPTION 'search range is invalid' USING ERRCODE='22023'; END IF;
  RETURN marketplace.normalize_search_listings_v1_semantics_legacy(jsonb_set(p_request,'{filters}',v_filters - ARRAY['vehicle_categories','listing_purposes','rental_price_day_min','rental_price_day_max','minimum_rental_days','with_driver_or_operator'],true));
END;
$$;

CREATE FUNCTION marketplace.vehicle_marketplace_v2_request_matches(p_request JSONB, p_document marketplace.listing_search_documents)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY INVOKER SET search_path = marketplace, pg_catalog AS $$
  SELECT (NOT (COALESCE(p_request -> 'filters','{}'::JSONB) ? 'vehicle_categories') OR p_document.vehicle_category::text = ANY(ARRAY(SELECT value FROM jsonb_array_elements_text(p_request -> 'filters' -> 'vehicle_categories') AS value)))
    AND (NOT (COALESCE(p_request -> 'filters','{}'::JSONB) ? 'listing_purposes') OR p_document.listing_purpose::text = ANY(ARRAY(SELECT value FROM jsonb_array_elements_text(p_request -> 'filters' -> 'listing_purposes') AS value)))
    AND ((p_request -> 'filters' ->> 'rental_price_day_min') IS NULL OR p_document.rental_price_per_day >= (p_request -> 'filters' ->> 'rental_price_day_min')::BIGINT)
    AND ((p_request -> 'filters' ->> 'rental_price_day_max') IS NULL OR p_document.rental_price_per_day <= (p_request -> 'filters' ->> 'rental_price_day_max')::BIGINT)
    AND ((p_request -> 'filters' ->> 'minimum_rental_days') IS NULL OR p_document.minimum_rental_days <= (p_request -> 'filters' ->> 'minimum_rental_days')::INTEGER)
    AND ((p_request -> 'filters' ->> 'with_driver_or_operator') IS NULL OR p_document.with_driver_or_operator = (p_request -> 'filters' ->> 'with_driver_or_operator')::BOOLEAN);
$$;
CREATE OR REPLACE FUNCTION marketplace.search_listing_document_matches_v1(
  p_semantics marketplace.search_listings_v1_semantics,
  p_document marketplace.listing_search_documents
)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = marketplace, pg_catalog
AS $$
BEGIN
  IF NOT marketplace.is_jolmod_kazakhstan_city(p_document.city_id) THEN RETURN FALSE; END IF;
  RETURN (cardinality(p_semantics.make_ids) = 0 OR p_document.make_id = ANY(p_semantics.make_ids))
    AND (cardinality(p_semantics.model_ids) = 0 OR p_document.model_id = ANY(p_semantics.model_ids))
    AND (cardinality(p_semantics.variant_ids) = 0 OR p_document.variant_id = ANY(p_semantics.variant_ids))
    AND (cardinality(p_semantics.city_ids) = 0 OR p_document.city_id = ANY(p_semantics.city_ids))
    AND (cardinality(p_semantics.district_ids) = 0 OR p_document.district_id = ANY(p_semantics.district_ids))
    AND (p_semantics.condition IS NULL OR p_document.condition = p_semantics.condition)
    AND (p_semantics.price_min IS NULL OR COALESCE(p_document.price_amount,p_document.rental_price_per_day) >= p_semantics.price_min)
    AND (p_semantics.price_max IS NULL OR COALESCE(p_document.price_amount,p_document.rental_price_per_day) <= p_semantics.price_max)
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
    AND (p_semantics.query IS NULL OR concat_ws(' ',p_document.make_name,p_document.model_name,p_document.variant_name,p_document.city_name,p_document.district_name,p_document.vehicle_category::text) ILIKE '%' || replace(replace(replace(p_semantics.query,E'\\',E'\\\\'),'%','\\%'),'_','\\_') || '%' ESCAPE E'\\');
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.search_listings_v1(p_request JSONB) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = marketplace, pg_catalog AS $$
DECLARE v_semantics marketplace.search_listings_v1_semantics; v_cursor JSONB := p_request -> 'cursor'; v_limit INTEGER := 24; v_sort TEXT := COALESCE(p_request ->> 'sort','newest'); v_cursor_listing_id UUID; v_cursor_freshness TIMESTAMPTZ; v_cursor_price BIGINT; v_cursor_year SMALLINT; v_cursor_mileage INTEGER; v_items JSONB; v_next_cursor JSONB;
BEGIN
  v_semantics := marketplace.normalize_search_listings_v1_semantics(p_request);
  IF p_request ? 'limit' AND (jsonb_typeof(p_request->'limit')<>'number' OR (p_request->>'limit') !~ '^(?:[1-9]|[1-5][0-9]|60)$') THEN RAISE EXCEPTION 'search limit is invalid' USING ERRCODE='22023'; END IF;
  IF p_request ? 'limit' THEN v_limit := (p_request->>'limit')::INTEGER; END IF;
  IF v_limit NOT BETWEEN 1 AND 60 OR v_sort NOT IN ('newest','price_asc','price_desc','year_desc','mileage_asc') THEN RAISE EXCEPTION 'search pagination or sort is invalid' USING ERRCODE='22023'; END IF;
  IF v_cursor IS NOT NULL THEN
    IF jsonb_typeof(v_cursor)<>'object' OR v_cursor->>'version' IS DISTINCT FROM 'v1' OR v_cursor->>'sort' IS DISTINCT FROM v_sort OR EXISTS(SELECT 1 FROM jsonb_object_keys(v_cursor) key WHERE key NOT IN ('version','sort','listing_id','published_at','ranked_at','price_amount','year','mileage_km')) OR NOT COALESCE((v_cursor->>'listing_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',false) OR (v_sort='newest' AND jsonb_typeof(COALESCE(v_cursor->'ranked_at',v_cursor->'published_at')) IS DISTINCT FROM 'string') OR (v_sort IN ('price_asc','price_desc') AND (jsonb_typeof(v_cursor->'price_amount') IS DISTINCT FROM 'number' OR v_cursor->>'price_amount' !~ '^-?[0-9]+$')) OR (v_sort='year_desc' AND (jsonb_typeof(v_cursor->'year') IS DISTINCT FROM 'number' OR v_cursor->>'year' !~ '^-?[0-9]+$')) OR (v_sort='mileage_asc' AND (jsonb_typeof(v_cursor->'mileage_km') IS DISTINCT FROM 'number' OR v_cursor->>'mileage_km' !~ '^-?[0-9]+$')) THEN RAISE EXCEPTION 'search cursor is invalid' USING ERRCODE='22023'; END IF;
    v_cursor_listing_id := (v_cursor->>'listing_id')::UUID;
    BEGIN IF v_sort='newest' THEN v_cursor_freshness := COALESCE(v_cursor->>'ranked_at',v_cursor->>'published_at')::TIMESTAMPTZ; ELSIF v_sort IN ('price_asc','price_desc') THEN v_cursor_price := (v_cursor->>'price_amount')::BIGINT; ELSIF v_sort='year_desc' THEN v_cursor_year := (v_cursor->>'year')::SMALLINT; ELSE v_cursor_mileage := (v_cursor->>'mileage_km')::INTEGER; END IF; EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow OR numeric_value_out_of_range THEN RAISE EXCEPTION 'search cursor is invalid' USING ERRCODE='22023'; END;
  END IF;
  WITH filtered AS (SELECT d.* FROM marketplace.listing_search_documents d WHERE marketplace.search_listing_document_matches_v1(v_semantics,d) AND marketplace.vehicle_marketplace_v2_request_matches(p_request,d)), page AS (SELECT d.*,row_number() OVER (ORDER BY CASE WHEN v_sort='newest' THEN COALESCE(d.raised_at,d.published_at,'epoch'::TIMESTAMPTZ) END DESC,CASE WHEN v_sort='price_asc' THEN COALESCE(d.price_amount,d.rental_price_per_day) END ASC,CASE WHEN v_sort='price_desc' THEN COALESCE(d.price_amount,d.rental_price_per_day) END DESC,CASE WHEN v_sort='year_desc' THEN COALESCE(d.year,-1::SMALLINT) END DESC,CASE WHEN v_sort='mileage_asc' THEN COALESCE(d.mileage_km,2147483647) END ASC,d.listing_id ASC) page_position FROM filtered d WHERE v_cursor_listing_id IS NULL OR (v_sort='newest' AND (COALESCE(d.raised_at,d.published_at,'epoch'::TIMESTAMPTZ),d.listing_id)<(v_cursor_freshness,v_cursor_listing_id)) OR (v_sort='price_asc' AND (COALESCE(d.price_amount,d.rental_price_per_day),d.listing_id)>(v_cursor_price,v_cursor_listing_id)) OR (v_sort='price_desc' AND (COALESCE(d.price_amount,d.rental_price_per_day),d.listing_id)<(v_cursor_price,v_cursor_listing_id)) OR (v_sort='year_desc' AND (COALESCE(d.year,-1::SMALLINT),d.listing_id)<(v_cursor_year,v_cursor_listing_id)) OR (v_sort='mileage_asc' AND (COALESCE(d.mileage_km,2147483647),d.listing_id)>(v_cursor_mileage,v_cursor_listing_id)) ORDER BY CASE WHEN v_sort='newest' THEN COALESCE(d.raised_at,d.published_at,'epoch'::TIMESTAMPTZ) END DESC,CASE WHEN v_sort='price_asc' THEN COALESCE(d.price_amount,d.rental_price_per_day) END ASC,CASE WHEN v_sort='price_desc' THEN COALESCE(d.price_amount,d.rental_price_per_day) END DESC,CASE WHEN v_sort='year_desc' THEN COALESCE(d.year,-1::SMALLINT) END DESC,CASE WHEN v_sort='mileage_asc' THEN COALESCE(d.mileage_km,2147483647) END ASC,d.listing_id ASC LIMIT v_limit), cards AS (SELECT page.*,listing.views_count FROM page JOIN marketplace.listings listing ON listing.id=page.listing_id AND listing.status='active' AND listing.moderation_status='active')
  SELECT COALESCE(jsonb_agg(jsonb_build_object('listing_id',listing_id,'make_id',make_id,'model_id',model_id,'variant_id',variant_id,'make_name',make_name,'model_name',model_name,'variant_name',variant_name,'condition',condition,'year',year,'mileage_km',mileage_km,'fuel_type',fuel_type,'transmission',transmission,'body_type',body_type,'drive_type',drive_type,'color',color,'engine_volume_l',engine_volume_l,'power_kw',power_kw,'battery_capacity_kwh',battery_capacity_kwh,'electric_range_km',electric_range_km,'seller_service_declaration',seller_service_declaration,'seller_damage_declaration',seller_damage_declaration,'price_amount',price_amount,'currency',currency,'price_negotiable',price_negotiable,'trade_in_accepted',trade_in_accepted,'city_id',city_id,'district_id',district_id,'city_name',city_name,'district_name',district_name,'seller_type',seller_type,'cover_image_url',cover_image_url,'photo_count',photo_count,'has_video',has_video,'published_at',published_at,'views_count',views_count,'projected_at',projected_at,'vehicle_category',vehicle_category,'listing_purpose',listing_purpose,'rental_price_per_day',rental_price_per_day,'rental_price_per_month',rental_price_per_month,'minimum_rental_days',minimum_rental_days,'security_deposit_amount',security_deposit_amount,'with_driver_or_operator',with_driver_or_operator) ORDER BY page_position),'[]'::JSONB),(jsonb_agg(jsonb_build_object('version','v1','sort',v_sort,'listing_id',listing_id,'ranked_at',COALESCE(raised_at,published_at,'epoch'::TIMESTAMPTZ),'price_amount',COALESCE(price_amount,rental_price_per_day),'year',COALESCE(year,-1::SMALLINT),'mileage_km',COALESCE(mileage_km,2147483647)) ORDER BY page_position)->-1) INTO v_items,v_next_cursor FROM cards;
  RETURN jsonb_build_object('version','v1','items',v_items,'next_cursor',v_next_cursor);
END;
$$;
REVOKE ALL ON FUNCTION marketplace.search_listing_document_matches_v1(marketplace.search_listings_v1_semantics, marketplace.listing_search_documents), marketplace.search_listings_v1(JSONB) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.search_listing_document_matches_v1(marketplace.search_listings_v1_semantics, marketplace.listing_search_documents), marketplace.search_listings_v1(JSONB) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.normalize_search_listings_v1_semantics(JSONB), marketplace.vehicle_marketplace_v2_request_matches(JSONB, marketplace.listing_search_documents) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.normalize_search_listings_v1_semantics(JSONB), marketplace.vehicle_marketplace_v2_request_matches(JSONB, marketplace.listing_search_documents) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION marketplace.count_search_listings_v1(p_request JSONB)
RETURNS BIGINT LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = marketplace, pg_catalog AS $$
DECLARE v_semantics marketplace.search_listings_v1_semantics;
BEGIN
  v_semantics := marketplace.normalize_search_listings_v1_semantics(p_request);
  RETURN (SELECT count(*) FROM marketplace.listing_search_documents AS document WHERE marketplace.search_listing_document_matches_v1(v_semantics,document) AND marketplace.vehicle_marketplace_v2_request_matches(p_request,document));
END;
$$;
REVOKE ALL ON FUNCTION marketplace.count_search_listings_v1(JSONB) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.count_search_listings_v1(JSONB) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
