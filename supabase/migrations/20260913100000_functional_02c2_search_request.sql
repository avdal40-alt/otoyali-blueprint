BEGIN;

-- FUNCTIONAL-02C2: the public Search contract is deliberately a single
-- versioned request/response boundary over the public-safe projection. The
-- canonical listing/profile tables, seller identity and private VIN data are
-- never queried here.
CREATE INDEX listing_search_documents_year_keyset_idx
  ON marketplace.listing_search_documents (year DESC, listing_id);
CREATE INDEX listing_search_documents_mileage_keyset_idx
  ON marketplace.listing_search_documents (mileage_km ASC NULLS LAST, listing_id);

CREATE FUNCTION marketplace.search_listings_v1(p_request JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = marketplace, pg_catalog
AS $$
DECLARE
  v_filters JSONB := COALESCE(p_request -> 'filters', '{}'::JSONB);
  v_cursor JSONB := p_request -> 'cursor';
  v_limit INTEGER := 24;
  v_sort TEXT := COALESCE(p_request ->> 'sort', 'newest');
  v_query TEXT;
  v_condition TEXT;
  v_price_min BIGINT;
  v_price_max BIGINT;
  v_year_min SMALLINT;
  v_year_max SMALLINT;
  v_mileage_min INTEGER;
  v_mileage_max INTEGER;
  v_engine_volume_min NUMERIC(4, 1);
  v_engine_volume_max NUMERIC(4, 1);
  v_power_kw_min SMALLINT;
  v_power_kw_max SMALLINT;
  v_battery_capacity_kwh_min NUMERIC(6, 1);
  v_battery_capacity_kwh_max NUMERIC(6, 1);
  v_electric_range_km_min SMALLINT;
  v_electric_range_km_max SMALLINT;
  v_trade_in_accepted BOOLEAN;
  v_price_negotiable BOOLEAN;
  v_has_photos BOOLEAN;
  v_has_video BOOLEAN;
  v_make_ids UUID[];
  v_model_ids UUID[];
  v_variant_ids UUID[];
  v_city_ids UUID[];
  v_district_ids UUID[];
  v_fuel_types TEXT[];
  v_transmissions TEXT[];
  v_body_types TEXT[];
  v_drive_types TEXT[];
  v_colors TEXT[];
  v_seller_types TEXT[];
  v_service_declarations TEXT[];
  v_damage_declarations TEXT[];
  v_cursor_listing_id UUID;
  v_cursor_published_at TIMESTAMPTZ;
  v_cursor_price BIGINT;
  v_cursor_year SMALLINT;
  v_cursor_mileage INTEGER;
  v_items JSONB;
  v_next_cursor JSONB;
BEGIN
  IF jsonb_typeof(p_request) IS DISTINCT FROM 'object'
     OR p_request ->> 'version' IS DISTINCT FROM 'v1'
     OR EXISTS (
       SELECT 1
       FROM jsonb_object_keys(p_request) AS key
       WHERE key NOT IN ('version', 'filters', 'cursor', 'limit', 'sort')
     ) THEN
    RAISE EXCEPTION 'search request must use version v1' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(v_filters) <> 'object'
     OR EXISTS (
       SELECT 1
       FROM jsonb_object_keys(v_filters) AS key
       WHERE key NOT IN (
         'q', 'condition', 'make_ids', 'model_ids', 'variant_ids', 'price_min', 'price_max',
         'year_min', 'year_max', 'mileage_min', 'mileage_max', 'city_ids', 'district_ids',
         'fuel_types', 'transmissions', 'body_types', 'drive_types', 'colors', 'seller_types',
         'engine_volume_min', 'engine_volume_max', 'power_kw_min', 'power_kw_max',
         'battery_capacity_kwh_min', 'battery_capacity_kwh_max', 'electric_range_km_min',
         'electric_range_km_max', 'seller_service_declarations', 'seller_damage_declarations',
         'trade_in_accepted', 'price_negotiable', 'has_photos', 'has_video'
       )
     ) THEN
    RAISE EXCEPTION 'search filters are invalid' USING ERRCODE = '22023';
  END IF;

  IF p_request ? 'limit' AND (jsonb_typeof(p_request -> 'limit') <> 'number' OR (p_request ->> 'limit') !~ '^(?:[1-9]|[1-5][0-9]|60)$') THEN
    RAISE EXCEPTION 'search limit is invalid' USING ERRCODE = '22023';
  END IF;
  IF p_request ? 'limit' THEN v_limit := (p_request ->> 'limit')::INTEGER; END IF;
  IF v_limit NOT BETWEEN 1 AND 60 OR v_sort NOT IN ('newest', 'price_asc', 'price_desc', 'year_desc', 'mileage_asc') THEN
    RAISE EXCEPTION 'search pagination or sort is invalid' USING ERRCODE = '22023';
  END IF;

  -- Validate JSON scalars before casts so malformed public input always has a
  -- stable contract error rather than leaking PostgreSQL cast details.
  IF (v_filters ? 'q' AND jsonb_typeof(v_filters -> 'q') <> 'string')
     OR (v_filters ? 'condition' AND jsonb_typeof(v_filters -> 'condition') <> 'string')
     OR EXISTS (SELECT 1 FROM jsonb_each(v_filters) AS e(key, value) WHERE key IN ('trade_in_accepted', 'price_negotiable', 'has_photos', 'has_video') AND jsonb_typeof(value) <> 'boolean')
     OR EXISTS (SELECT 1 FROM jsonb_each(v_filters) AS e(key, value) WHERE key IN ('make_ids', 'model_ids', 'variant_ids', 'city_ids', 'district_ids', 'fuel_types', 'transmissions', 'body_types', 'drive_types', 'colors', 'seller_types', 'seller_service_declarations', 'seller_damage_declarations') AND jsonb_typeof(value) <> 'array')
     OR EXISTS (SELECT 1 FROM jsonb_each(v_filters) AS e(key, value) WHERE key IN ('price_min', 'price_max', 'year_min', 'year_max', 'mileage_min', 'mileage_max', 'power_kw_min', 'power_kw_max', 'electric_range_km_min', 'electric_range_km_max') AND (jsonb_typeof(value) <> 'number' OR value::TEXT !~ '^-?[0-9]+$'))
     OR EXISTS (SELECT 1 FROM jsonb_each(v_filters) AS e(key, value) WHERE key IN ('engine_volume_min', 'engine_volume_max', 'battery_capacity_kwh_min', 'battery_capacity_kwh_max') AND (jsonb_typeof(value) <> 'number' OR value::TEXT !~ '^-?[0-9]+(?:\.[0-9])?$')) THEN
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
    v_query := NULLIF(left(btrim(v_filters ->> 'q'), 120), '');
    v_condition := NULLIF(v_filters ->> 'condition', '');
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

  IF v_cursor IS NOT NULL THEN
    IF jsonb_typeof(v_cursor) <> 'object'
       OR v_cursor ->> 'version' IS DISTINCT FROM 'v1'
       OR v_cursor ->> 'sort' IS DISTINCT FROM v_sort
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
      ELSE v_cursor_mileage := (v_cursor ->> 'mileage_km')::INTEGER;
      END IF;
    EXCEPTION WHEN invalid_text_representation OR datetime_field_overflow OR numeric_value_out_of_range THEN
      RAISE EXCEPTION 'search cursor is invalid' USING ERRCODE = '22023';
    END;
  END IF;

  WITH filtered AS (
    SELECT d.*
    FROM marketplace.listing_search_documents AS d
    WHERE (cardinality(v_make_ids) = 0 OR d.make_id = ANY(v_make_ids))
      AND (cardinality(v_model_ids) = 0 OR d.model_id = ANY(v_model_ids))
      AND (cardinality(v_variant_ids) = 0 OR d.variant_id = ANY(v_variant_ids))
      AND (cardinality(v_city_ids) = 0 OR d.city_id = ANY(v_city_ids))
      AND (cardinality(v_district_ids) = 0 OR d.district_id = ANY(v_district_ids))
      AND (v_condition IS NULL OR d.condition = v_condition)
      AND (v_price_min IS NULL OR d.price_amount >= v_price_min) AND (v_price_max IS NULL OR d.price_amount <= v_price_max)
      AND (v_year_min IS NULL OR d.year >= v_year_min) AND (v_year_max IS NULL OR d.year <= v_year_max)
      AND (v_mileage_min IS NULL OR d.mileage_km >= v_mileage_min) AND (v_mileage_max IS NULL OR d.mileage_km <= v_mileage_max)
      AND (cardinality(v_fuel_types) = 0 OR d.fuel_type = ANY(v_fuel_types)) AND (cardinality(v_transmissions) = 0 OR d.transmission = ANY(v_transmissions))
      AND (cardinality(v_body_types) = 0 OR d.body_type = ANY(v_body_types)) AND (cardinality(v_drive_types) = 0 OR d.drive_type = ANY(v_drive_types))
      AND (cardinality(v_colors) = 0 OR d.color = ANY(v_colors)) AND (cardinality(v_seller_types) = 0 OR d.seller_type = ANY(v_seller_types))
      AND (v_engine_volume_min IS NULL OR d.engine_volume_l >= v_engine_volume_min) AND (v_engine_volume_max IS NULL OR d.engine_volume_l <= v_engine_volume_max)
      AND (v_power_kw_min IS NULL OR d.power_kw >= v_power_kw_min) AND (v_power_kw_max IS NULL OR d.power_kw <= v_power_kw_max)
      AND (v_battery_capacity_kwh_min IS NULL OR d.battery_capacity_kwh >= v_battery_capacity_kwh_min) AND (v_battery_capacity_kwh_max IS NULL OR d.battery_capacity_kwh <= v_battery_capacity_kwh_max)
      AND (v_electric_range_km_min IS NULL OR d.electric_range_km >= v_electric_range_km_min) AND (v_electric_range_km_max IS NULL OR d.electric_range_km <= v_electric_range_km_max)
      AND (cardinality(v_service_declarations) = 0 OR d.seller_service_declaration = ANY(v_service_declarations))
      AND (cardinality(v_damage_declarations) = 0 OR d.seller_damage_declaration = ANY(v_damage_declarations))
      AND (v_trade_in_accepted IS NULL OR d.trade_in_accepted = v_trade_in_accepted) AND (v_price_negotiable IS NULL OR d.price_negotiable = v_price_negotiable)
      AND (v_has_photos IS NULL OR (d.photo_count > 0) = v_has_photos) AND (v_has_video IS NULL OR d.has_video = v_has_video)
      AND (v_query IS NULL OR concat_ws(' ', d.make_name, d.model_name, d.variant_name, d.city_name, d.district_name) ILIKE '%' || replace(replace(replace(v_query, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%' ESCAPE E'\\')
  ), page AS (
    SELECT d.*, row_number() OVER (
      ORDER BY
        CASE WHEN v_sort = 'newest' THEN COALESCE(d.published_at, 'epoch'::TIMESTAMPTZ) END DESC,
        CASE WHEN v_sort = 'price_asc' THEN d.price_amount END ASC,
        CASE WHEN v_sort = 'price_desc' THEN d.price_amount END DESC,
        CASE WHEN v_sort = 'year_desc' THEN COALESCE(d.year, -1::SMALLINT) END DESC,
        CASE WHEN v_sort = 'mileage_asc' THEN COALESCE(d.mileage_km, 2147483647) END ASC,
        d.listing_id ASC
    ) AS page_position
    FROM filtered AS d
    WHERE v_cursor_listing_id IS NULL
       OR (v_sort = 'newest' AND (COALESCE(d.published_at, 'epoch'::TIMESTAMPTZ), d.listing_id) < (v_cursor_published_at, v_cursor_listing_id))
       OR (v_sort = 'price_asc' AND (d.price_amount, d.listing_id) > (v_cursor_price, v_cursor_listing_id))
       OR (v_sort = 'price_desc' AND (d.price_amount, d.listing_id) < (v_cursor_price, v_cursor_listing_id))
       OR (v_sort = 'year_desc' AND (COALESCE(d.year, -1::SMALLINT), d.listing_id) < (v_cursor_year, v_cursor_listing_id))
       OR (v_sort = 'mileage_asc' AND (COALESCE(d.mileage_km, 2147483647), d.listing_id) > (v_cursor_mileage, v_cursor_listing_id))
    ORDER BY
      CASE WHEN v_sort = 'newest' THEN COALESCE(d.published_at, 'epoch'::TIMESTAMPTZ) END DESC,
      CASE WHEN v_sort = 'price_asc' THEN d.price_amount END ASC,
      CASE WHEN v_sort = 'price_desc' THEN d.price_amount END DESC,
      CASE WHEN v_sort = 'year_desc' THEN COALESCE(d.year, -1::SMALLINT) END DESC,
      CASE WHEN v_sort = 'mileage_asc' THEN COALESCE(d.mileage_km, 2147483647) END ASC,
      d.listing_id ASC
    LIMIT v_limit
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
    'published_at', published_at, 'projected_at', projected_at
  ) ORDER BY page_position), '[]'::JSONB),
  (jsonb_agg(jsonb_build_object(
    'version', 'v1', 'sort', v_sort, 'listing_id', listing_id,
    'published_at', COALESCE(published_at, 'epoch'::TIMESTAMPTZ), 'price_amount', price_amount,
    'year', COALESCE(year, -1::SMALLINT), 'mileage_km', COALESCE(mileage_km, 2147483647)
  ) ORDER BY page_position) -> -1)
  INTO v_items, v_next_cursor
  FROM page;

  RETURN jsonb_build_object('version', 'v1', 'items', v_items, 'next_cursor', v_next_cursor);
END;
$$;

REVOKE ALL ON FUNCTION marketplace.search_listings_v1(JSONB) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.search_listings_v1(JSONB) TO anon, authenticated, service_role;
COMMENT ON FUNCTION marketplace.search_listings_v1(JSONB) IS
  'FUNCTIONAL-02C2 public Search v1 request/response boundary. It reads only marketplace.listing_search_documents and returns no seller identity, contact, private VIN, evidence, moderation, or canonical private fields.';

NOTIFY pgrst, 'reload schema';

COMMIT;
