BEGIN;

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
       OR NOT COALESCE((v_cursor ->> 'listing_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', FALSE)
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

REVOKE ALL ON FUNCTION marketplace.search_listings_v1(JSONB) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.search_listings_v1(JSONB) TO anon, authenticated, service_role;
COMMENT ON FUNCTION marketplace.search_listings_v1(JSONB) IS 'FUNCTIONAL-02C2 public Search v1 request/response boundary. It reads only marketplace.listing_search_documents and returns no seller identity, contact, private VIN, evidence, moderation, or canonical private fields.';
NOTIFY pgrst, 'reload schema';

COMMIT;
