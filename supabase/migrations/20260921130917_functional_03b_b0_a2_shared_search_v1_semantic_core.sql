BEGIN;

CREATE TYPE marketplace.search_listings_v1_semantics AS (
  query TEXT, condition TEXT, price_min BIGINT, price_max BIGINT,
  year_min SMALLINT, year_max SMALLINT, mileage_min INTEGER, mileage_max INTEGER,
  engine_volume_min NUMERIC(4, 1), engine_volume_max NUMERIC(4, 1),
  power_kw_min SMALLINT, power_kw_max SMALLINT,
  battery_capacity_kwh_min NUMERIC(6, 1), battery_capacity_kwh_max NUMERIC(6, 1),
  electric_range_km_min SMALLINT, electric_range_km_max SMALLINT,
  trade_in_accepted BOOLEAN, price_negotiable BOOLEAN, has_photos BOOLEAN, has_video BOOLEAN,
  make_ids UUID[], model_ids UUID[], variant_ids UUID[], city_ids UUID[], district_ids UUID[],
  fuel_types TEXT[], transmissions TEXT[], body_types TEXT[], drive_types TEXT[], colors TEXT[],
  seller_types TEXT[], service_declarations TEXT[], damage_declarations TEXT[]
);

CREATE FUNCTION marketplace.normalize_search_listings_v1_semantics(p_request JSONB)
RETURNS marketplace.search_listings_v1_semantics
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = marketplace, pg_catalog
AS $$
DECLARE
  v_filters JSONB := COALESCE(p_request -> 'filters', '{}'::JSONB);
  v_query TEXT; v_condition TEXT; v_price_min BIGINT; v_price_max BIGINT;
  v_year_min SMALLINT; v_year_max SMALLINT; v_mileage_min INTEGER; v_mileage_max INTEGER;
  v_engine_volume_min NUMERIC(4, 1); v_engine_volume_max NUMERIC(4, 1);
  v_power_kw_min SMALLINT; v_power_kw_max SMALLINT;
  v_battery_capacity_kwh_min NUMERIC(6, 1); v_battery_capacity_kwh_max NUMERIC(6, 1);
  v_electric_range_km_min SMALLINT; v_electric_range_km_max SMALLINT;
  v_trade_in_accepted BOOLEAN; v_price_negotiable BOOLEAN; v_has_photos BOOLEAN; v_has_video BOOLEAN;
  v_make_ids UUID[]; v_model_ids UUID[]; v_variant_ids UUID[]; v_city_ids UUID[]; v_district_ids UUID[];
  v_fuel_types TEXT[]; v_transmissions TEXT[]; v_body_types TEXT[]; v_drive_types TEXT[]; v_colors TEXT[];
  v_seller_types TEXT[]; v_service_declarations TEXT[]; v_damage_declarations TEXT[];
BEGIN
  IF jsonb_typeof(p_request) IS DISTINCT FROM 'object'
     OR p_request ->> 'version' IS DISTINCT FROM 'v1'
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_request) AS key WHERE key NOT IN ('version', 'filters', 'cursor', 'limit', 'sort')) THEN
    RAISE EXCEPTION 'search request must use version v1' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(v_filters) <> 'object'
     OR EXISTS (SELECT 1 FROM jsonb_object_keys(v_filters) AS key WHERE key NOT IN (
       'q', 'condition', 'make_ids', 'model_ids', 'variant_ids', 'price_min', 'price_max',
       'year_min', 'year_max', 'mileage_min', 'mileage_max', 'city_ids', 'district_ids',
       'fuel_types', 'transmissions', 'body_types', 'drive_types', 'colors', 'seller_types',
       'engine_volume_min', 'engine_volume_max', 'power_kw_min', 'power_kw_max',
       'battery_capacity_kwh_min', 'battery_capacity_kwh_max', 'electric_range_km_min', 'electric_range_km_max',
       'seller_service_declarations', 'seller_damage_declarations', 'trade_in_accepted', 'price_negotiable', 'has_photos', 'has_video')) THEN
    RAISE EXCEPTION 'search filters are invalid' USING ERRCODE = '22023';
  END IF;
  IF (v_filters ? 'q' AND jsonb_typeof(v_filters -> 'q') <> 'string')
     OR (v_filters ? 'condition' AND jsonb_typeof(v_filters -> 'condition') <> 'string')
     OR EXISTS (SELECT 1 FROM jsonb_each(v_filters) AS e(key, value) WHERE key IN ('trade_in_accepted', 'price_negotiable', 'has_photos', 'has_video') AND jsonb_typeof(value) <> 'boolean')
     OR EXISTS (SELECT 1 FROM jsonb_each(v_filters) AS e(key, value) WHERE key IN ('make_ids', 'model_ids', 'variant_ids', 'city_ids', 'district_ids', 'fuel_types', 'transmissions', 'body_types', 'drive_types', 'colors', 'seller_types', 'seller_service_declarations', 'seller_damage_declarations') AND jsonb_typeof(value) <> 'array')
     OR EXISTS (SELECT 1 FROM jsonb_each(v_filters) AS e(key, value) WHERE key IN ('price_min', 'price_max', 'year_min', 'year_max', 'mileage_min', 'mileage_max', 'power_kw_min', 'power_kw_max', 'electric_range_km_min', 'electric_range_km_max') AND (jsonb_typeof(value) <> 'number' OR value::TEXT !~ '^-?[0-9]+$'))
     OR EXISTS (SELECT 1 FROM jsonb_each(v_filters) AS e(key, value) WHERE key IN ('engine_volume_min', 'engine_volume_max', 'battery_capacity_kwh_min', 'battery_capacity_kwh_max') AND (jsonb_typeof(value) <> 'number' OR value::TEXT !~ '^-?[0-9]+(?:\\.[0-9])?$')) THEN
    RAISE EXCEPTION 'search filter values are invalid' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(v_filters -> 'make_ids', '[]'::JSONB)) AS value WHERE value IS NULL OR value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
     OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(v_filters -> 'model_ids', '[]'::JSONB)) AS value WHERE value IS NULL OR value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
     OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(v_filters -> 'variant_ids', '[]'::JSONB)) AS value WHERE value IS NULL OR value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
     OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(v_filters -> 'city_ids', '[]'::JSONB)) AS value WHERE value IS NULL OR value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')
     OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(v_filters -> 'district_ids', '[]'::JSONB)) AS value WHERE value IS NULL OR value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$') THEN
    RAISE EXCEPTION 'search identifier filters are invalid' USING ERRCODE = '22023';
  END IF;
  BEGIN
    v_query := NULLIF(left(btrim(v_filters ->> 'q'), 120), ''); v_condition := NULLIF(v_filters ->> 'condition', '');
    v_price_min := (v_filters ->> 'price_min')::BIGINT; v_price_max := (v_filters ->> 'price_max')::BIGINT;
    v_year_min := (v_filters ->> 'year_min')::SMALLINT; v_year_max := (v_filters ->> 'year_max')::SMALLINT;
    v_mileage_min := (v_filters ->> 'mileage_min')::INTEGER; v_mileage_max := (v_filters ->> 'mileage_max')::INTEGER;
    v_engine_volume_min := (v_filters ->> 'engine_volume_min')::NUMERIC(4, 1); v_engine_volume_max := (v_filters ->> 'engine_volume_max')::NUMERIC(4, 1);
    v_power_kw_min := (v_filters ->> 'power_kw_min')::SMALLINT; v_power_kw_max := (v_filters ->> 'power_kw_max')::SMALLINT;
    v_battery_capacity_kwh_min := (v_filters ->> 'battery_capacity_kwh_min')::NUMERIC(6, 1); v_battery_capacity_kwh_max := (v_filters ->> 'battery_capacity_kwh_max')::NUMERIC(6, 1);
    v_electric_range_km_min := (v_filters ->> 'electric_range_km_min')::SMALLINT; v_electric_range_km_max := (v_filters ->> 'electric_range_km_max')::SMALLINT;
    v_trade_in_accepted := (v_filters ->> 'trade_in_accepted')::BOOLEAN; v_price_negotiable := (v_filters ->> 'price_negotiable')::BOOLEAN;
    v_has_photos := (v_filters ->> 'has_photos')::BOOLEAN; v_has_video := (v_filters ->> 'has_video')::BOOLEAN;
    v_make_ids := ARRAY(SELECT value::UUID FROM jsonb_array_elements_text(COALESCE(v_filters -> 'make_ids', '[]'::JSONB)) AS value);
    v_model_ids := ARRAY(SELECT value::UUID FROM jsonb_array_elements_text(COALESCE(v_filters -> 'model_ids', '[]'::JSONB)) AS value);
    v_variant_ids := ARRAY(SELECT value::UUID FROM jsonb_array_elements_text(COALESCE(v_filters -> 'variant_ids', '[]'::JSONB)) AS value);
    v_city_ids := ARRAY(SELECT value::UUID FROM jsonb_array_elements_text(COALESCE(v_filters -> 'city_ids', '[]'::JSONB)) AS value);
    v_district_ids := ARRAY(SELECT value::UUID FROM jsonb_array_elements_text(COALESCE(v_filters -> 'district_ids', '[]'::JSONB)) AS value);
    v_fuel_types := ARRAY(SELECT value FROM jsonb_array_elements_text(COALESCE(v_filters -> 'fuel_types', '[]'::JSONB)) AS value);
    v_transmissions := ARRAY(SELECT value FROM jsonb_array_elements_text(COALESCE(v_filters -> 'transmissions', '[]'::JSONB)) AS value);
    v_body_types := ARRAY(SELECT value FROM jsonb_array_elements_text(COALESCE(v_filters -> 'body_types', '[]'::JSONB)) AS value);
    v_drive_types := ARRAY(SELECT value FROM jsonb_array_elements_text(COALESCE(v_filters -> 'drive_types', '[]'::JSONB)) AS value);
    v_colors := ARRAY(SELECT value FROM jsonb_array_elements_text(COALESCE(v_filters -> 'colors', '[]'::JSONB)) AS value);
    v_seller_types := ARRAY(SELECT value FROM jsonb_array_elements_text(COALESCE(v_filters -> 'seller_types', '[]'::JSONB)) AS value);
    v_service_declarations := ARRAY(SELECT value FROM jsonb_array_elements_text(COALESCE(v_filters -> 'seller_service_declarations', '[]'::JSONB)) AS value);
    v_damage_declarations := ARRAY(SELECT value FROM jsonb_array_elements_text(COALESCE(v_filters -> 'seller_damage_declarations', '[]'::JSONB)) AS value);
  EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN
    RAISE EXCEPTION 'search filter values are invalid' USING ERRCODE = '22023';
  END;
  IF (v_price_min IS NOT NULL AND v_price_max IS NOT NULL AND v_price_min > v_price_max)
     OR (v_year_min IS NOT NULL AND v_year_max IS NOT NULL AND v_year_min > v_year_max)
     OR (v_mileage_min IS NOT NULL AND v_mileage_max IS NOT NULL AND v_mileage_min > v_mileage_max)
     OR (v_engine_volume_min IS NOT NULL AND v_engine_volume_max IS NOT NULL AND v_engine_volume_min > v_engine_volume_max)
     OR (v_power_kw_min IS NOT NULL AND v_power_kw_max IS NOT NULL AND v_power_kw_min > v_power_kw_max)
     OR (v_battery_capacity_kwh_min IS NOT NULL AND v_battery_capacity_kwh_max IS NOT NULL AND v_battery_capacity_kwh_min > v_battery_capacity_kwh_max)
     OR (v_electric_range_km_min IS NOT NULL AND v_electric_range_km_max IS NOT NULL AND v_electric_range_km_min > v_electric_range_km_max) THEN
    RAISE EXCEPTION 'search range is invalid' USING ERRCODE = '22023';
  END IF;
  RETURN ROW(v_query, v_condition, v_price_min, v_price_max, v_year_min, v_year_max, v_mileage_min, v_mileage_max,
    v_engine_volume_min, v_engine_volume_max, v_power_kw_min, v_power_kw_max, v_battery_capacity_kwh_min, v_battery_capacity_kwh_max,
    v_electric_range_km_min, v_electric_range_km_max, v_trade_in_accepted, v_price_negotiable, v_has_photos, v_has_video,
    v_make_ids, v_model_ids, v_variant_ids, v_city_ids, v_district_ids, v_fuel_types, v_transmissions, v_body_types,
    v_drive_types, v_colors, v_seller_types, v_service_declarations, v_damage_declarations)::marketplace.search_listings_v1_semantics;
END;
$$;

CREATE FUNCTION marketplace.search_listing_document_matches_v1(
  p_semantics marketplace.search_listings_v1_semantics,
  p_document marketplace.listing_search_documents
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = marketplace, pg_catalog
AS $$
  SELECT (cardinality(p_semantics.make_ids) = 0 OR p_document.make_id = ANY(p_semantics.make_ids))
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
$$;

CREATE OR REPLACE FUNCTION marketplace.search_listings_v1(p_request JSONB)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = marketplace, pg_catalog
AS $$
DECLARE
  v_semantics marketplace.search_listings_v1_semantics;
  v_cursor JSONB := p_request -> 'cursor'; v_limit INTEGER := 24; v_sort TEXT := COALESCE(p_request ->> 'sort', 'newest');
  v_cursor_listing_id UUID; v_cursor_published_at TIMESTAMPTZ; v_cursor_price BIGINT; v_cursor_year SMALLINT; v_cursor_mileage INTEGER;
  v_items JSONB; v_next_cursor JSONB;
BEGIN
  v_semantics := marketplace.normalize_search_listings_v1_semantics(p_request);
  IF p_request ? 'limit' AND (jsonb_typeof(p_request -> 'limit') <> 'number' OR (p_request ->> 'limit') !~ '^(?:[1-9]|[1-5][0-9]|60)$') THEN
    RAISE EXCEPTION 'search limit is invalid' USING ERRCODE = '22023';
  END IF;
  IF p_request ? 'limit' THEN v_limit := (p_request ->> 'limit')::INTEGER; END IF;
  IF v_limit NOT BETWEEN 1 AND 60 OR v_sort NOT IN ('newest', 'price_asc', 'price_desc', 'year_desc', 'mileage_asc') THEN
    RAISE EXCEPTION 'search pagination or sort is invalid' USING ERRCODE = '22023';
  END IF;
  IF v_cursor IS NOT NULL THEN
    IF jsonb_typeof(v_cursor) <> 'object' OR v_cursor ->> 'version' IS DISTINCT FROM 'v1' OR v_cursor ->> 'sort' IS DISTINCT FROM v_sort
       OR EXISTS (SELECT 1 FROM jsonb_object_keys(v_cursor) AS key WHERE key NOT IN ('version', 'sort', 'listing_id', 'published_at', 'price_amount', 'year', 'mileage_km'))
       OR NOT COALESCE((v_cursor ->> 'listing_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', FALSE)
       OR (v_sort = 'newest' AND jsonb_typeof(v_cursor -> 'published_at') IS DISTINCT FROM 'string')
       OR (v_sort IN ('price_asc', 'price_desc') AND (jsonb_typeof(v_cursor -> 'price_amount') IS DISTINCT FROM 'number' OR v_cursor ->> 'price_amount' !~ '^-?[0-9]+$'))
       OR (v_sort = 'year_desc' AND (jsonb_typeof(v_cursor -> 'year') IS DISTINCT FROM 'number' OR v_cursor ->> 'year' !~ '^-?[0-9]+$'))
       OR (v_sort = 'mileage_asc' AND (jsonb_typeof(v_cursor -> 'mileage_km') IS DISTINCT FROM 'number' OR v_cursor ->> 'mileage_km' !~ '^-?[0-9]+$')) THEN
      RAISE EXCEPTION 'search cursor is invalid' USING ERRCODE = '22023';
    END IF;
    v_cursor_listing_id := (v_cursor ->> 'listing_id')::UUID;
    BEGIN
      IF v_sort = 'newest' THEN v_cursor_published_at := (v_cursor ->> 'published_at')::TIMESTAMPTZ;
      ELSIF v_sort IN ('price_asc', 'price_desc') THEN v_cursor_price := (v_cursor ->> 'price_amount')::BIGINT;
      ELSIF v_sort = 'year_desc' THEN v_cursor_year := (v_cursor ->> 'year')::SMALLINT;
      ELSE v_cursor_mileage := (v_cursor ->> 'mileage_km')::INTEGER; END IF;
    EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'search cursor is invalid' USING ERRCODE = '22023';
    END;
  END IF;
  WITH filtered AS (
    SELECT d.* FROM marketplace.listing_search_documents AS d
    WHERE marketplace.search_listing_document_matches_v1(v_semantics, d)
  ), page AS (
    SELECT d.*, row_number() OVER (ORDER BY
      CASE WHEN v_sort = 'newest' THEN COALESCE(d.published_at, 'epoch'::TIMESTAMPTZ) END DESC,
      CASE WHEN v_sort = 'price_asc' THEN d.price_amount END ASC, CASE WHEN v_sort = 'price_desc' THEN d.price_amount END DESC,
      CASE WHEN v_sort = 'year_desc' THEN COALESCE(d.year, -1::SMALLINT) END DESC, CASE WHEN v_sort = 'mileage_asc' THEN COALESCE(d.mileage_km, 2147483647) END ASC, d.listing_id ASC) AS page_position
    FROM filtered AS d
    WHERE v_cursor_listing_id IS NULL
       OR (v_sort = 'newest' AND (COALESCE(d.published_at, 'epoch'::TIMESTAMPTZ), d.listing_id) < (v_cursor_published_at, v_cursor_listing_id))
       OR (v_sort = 'price_asc' AND (d.price_amount, d.listing_id) > (v_cursor_price, v_cursor_listing_id))
       OR (v_sort = 'price_desc' AND (d.price_amount, d.listing_id) < (v_cursor_price, v_cursor_listing_id))
       OR (v_sort = 'year_desc' AND (COALESCE(d.year, -1::SMALLINT), d.listing_id) < (v_cursor_year, v_cursor_listing_id))
       OR (v_sort = 'mileage_asc' AND (COALESCE(d.mileage_km, 2147483647), d.listing_id) > (v_cursor_mileage, v_cursor_listing_id))
    ORDER BY CASE WHEN v_sort = 'newest' THEN COALESCE(d.published_at, 'epoch'::TIMESTAMPTZ) END DESC,
      CASE WHEN v_sort = 'price_asc' THEN d.price_amount END ASC, CASE WHEN v_sort = 'price_desc' THEN d.price_amount END DESC,
      CASE WHEN v_sort = 'year_desc' THEN COALESCE(d.year, -1::SMALLINT) END DESC, CASE WHEN v_sort = 'mileage_asc' THEN COALESCE(d.mileage_km, 2147483647) END ASC, d.listing_id ASC LIMIT v_limit
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'listing_id', listing_id, 'make_id', make_id, 'model_id', model_id, 'variant_id', variant_id,
    'make_name', make_name, 'model_name', model_name, 'variant_name', variant_name, 'condition', condition,
    'year', year, 'mileage_km', mileage_km, 'fuel_type', fuel_type, 'transmission', transmission,
    'body_type', body_type, 'drive_type', drive_type, 'color', color, 'engine_volume_l', engine_volume_l,
    'power_kw', power_kw, 'battery_capacity_kwh', battery_capacity_kwh, 'electric_range_km', electric_range_km,
    'seller_service_declaration', seller_service_declaration, 'seller_damage_declaration', seller_damage_declaration,
    'price_amount', price_amount, 'currency', currency, 'price_negotiable', price_negotiable,
    'trade_in_accepted', trade_in_accepted, 'city_id', city_id, 'district_id', district_id,
    'city_name', city_name, 'district_name', district_name, 'seller_type', seller_type,
    'cover_image_url', cover_image_url, 'photo_count', photo_count, 'has_video', has_video,
    'published_at', published_at, 'projected_at', projected_at) ORDER BY page_position), '[]'::JSONB),
    (jsonb_agg(jsonb_build_object('version', 'v1', 'sort', v_sort, 'listing_id', listing_id,
      'published_at', COALESCE(published_at, 'epoch'::TIMESTAMPTZ), 'price_amount', price_amount,
      'year', COALESCE(year, -1::SMALLINT), 'mileage_km', COALESCE(mileage_km, 2147483647)) ORDER BY page_position) -> -1)
  INTO v_items, v_next_cursor FROM page;
  RETURN jsonb_build_object('version', 'v1', 'items', v_items, 'next_cursor', v_next_cursor);
END;
$$;

REVOKE ALL ON TYPE marketplace.search_listings_v1_semantics FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON TYPE marketplace.search_listings_v1_semantics TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.normalize_search_listings_v1_semantics(JSONB) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.search_listing_document_matches_v1(marketplace.search_listings_v1_semantics, marketplace.listing_search_documents) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.normalize_search_listings_v1_semantics(JSONB) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.search_listing_document_matches_v1(marketplace.search_listings_v1_semantics, marketplace.listing_search_documents) TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.search_listings_v1(JSONB) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.search_listings_v1(JSONB) TO anon, authenticated, service_role;
COMMENT ON FUNCTION marketplace.normalize_search_listings_v1_semantics(JSONB) IS 'FUNCTIONAL-03B-B0-A2 Search v1 semantic validation and normalization only.';
COMMENT ON FUNCTION marketplace.search_listing_document_matches_v1(marketplace.search_listings_v1_semantics, marketplace.listing_search_documents) IS 'FUNCTIONAL-03B-B0-A2 pure Search v1 predicate over caller-supplied semantics and one projection row.';
COMMENT ON FUNCTION marketplace.search_listings_v1(JSONB) IS 'FUNCTIONAL-02C2 public Search v1 request/response boundary. It reads only marketplace.listing_search_documents and returns no seller identity, contact, private VIN, evidence, moderation, or canonical private fields.';
NOTIFY pgrst, 'reload schema';
COMMIT;
