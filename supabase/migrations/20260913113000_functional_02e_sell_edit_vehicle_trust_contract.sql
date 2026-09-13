BEGIN;

CREATE OR REPLACE FUNCTION public.save_own_listing_vehicle_trust_contract(
  p_listing_id UUID,
  p_power_kw SMALLINT,
  p_door_count SMALLINT,
  p_seat_count SMALLINT,
  p_battery_capacity_kwh NUMERIC,
  p_electric_range_km SMALLINT,
  p_hybrid_type vehicle.hybrid_type,
  p_trade_in_accepted BOOLEAN,
  p_seller_damage_declaration vehicle.seller_damage_declaration,
  p_seller_damage_notes TEXT,
  p_seller_service_declaration vehicle.seller_service_declaration,
  p_body_panels JSONB DEFAULT '[]'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_listing RECORD;
  v_panel JSONB;
  v_panel_name vehicle.body_panel;
  v_panel_condition vehicle.body_panel_condition;
  v_note TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;
  IF p_trade_in_accepted IS NULL
     OR p_seller_damage_declaration IS NULL
     OR p_seller_service_declaration IS NULL
     OR jsonb_typeof(p_body_panels) <> 'array' THEN
    RAISE EXCEPTION 'invalid vehicle trust contract' USING ERRCODE = 'OT422';
  END IF;
  IF p_seller_damage_notes IS NOT NULL
     AND (char_length(btrim(p_seller_damage_notes)) = 0 OR char_length(p_seller_damage_notes) > 4000) THEN
    RAISE EXCEPTION 'invalid vehicle trust contract' USING ERRCODE = 'OT422';
  END IF;

  SELECT l.id, l.vehicle_profile_id
  INTO v_listing
  FROM marketplace.listings AS l
  WHERE l.id = p_listing_id AND l.seller_id = v_user_id
    AND l.status IN ('draft', 'removed')
    AND l.moderation_status IN ('pending_review', 'rejected')
    AND l.archived_at IS NULL
  FOR UPDATE;
  IF NOT FOUND OR NOT vehicle.is_current_profile_owner(v_listing.vehicle_profile_id) THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  PERFORM 1 FROM vehicle.vehicle_profiles AS vp
  WHERE vp.id = v_listing.vehicle_profile_id AND vp.created_by = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404';
  END IF;

  UPDATE vehicle.vehicle_profiles
  SET power_kw = p_power_kw,
      door_count = p_door_count,
      seat_count = p_seat_count,
      battery_capacity_kwh = p_battery_capacity_kwh,
      electric_range_km = p_electric_range_km,
      hybrid_type = p_hybrid_type,
      seller_damage_declaration = p_seller_damage_declaration,
      seller_damage_notes = NULLIF(btrim(p_seller_damage_notes), ''),
      seller_service_declaration = p_seller_service_declaration
  WHERE id = v_listing.vehicle_profile_id;

  UPDATE marketplace.listings
  SET trade_in_accepted = p_trade_in_accepted
  WHERE id = v_listing.id;

  -- The input is additive/updating rather than destructive: a client that
  -- cannot load a historic panel declaration must never erase it on save.
  INSERT INTO vehicle.profile_fact_evidence (vehicle_profile_id, field_key, provenance, evidence_kind)
  VALUES
    (v_listing.vehicle_profile_id, 'damage_declaration', 'seller', 'seller_statement'),
    (v_listing.vehicle_profile_id, 'service_declaration', 'seller', 'seller_statement');

  FOR v_panel IN SELECT value FROM jsonb_array_elements(p_body_panels) LOOP
    BEGIN
      v_panel_name := (v_panel ->> 'panel')::vehicle.body_panel;
      v_panel_condition := (v_panel ->> 'condition')::vehicle.body_panel_condition;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'invalid vehicle trust contract' USING ERRCODE = 'OT422';
    END;
    v_note := NULLIF(btrim(v_panel ->> 'seller_evidence_note'), '');
    IF v_note IS NOT NULL AND char_length(v_note) > 2000 THEN
      RAISE EXCEPTION 'invalid vehicle trust contract' USING ERRCODE = 'OT422';
    END IF;
    INSERT INTO vehicle.body_panel_declarations (vehicle_profile_id, panel, condition, provenance, seller_evidence_note)
    VALUES (v_listing.vehicle_profile_id, v_panel_name, v_panel_condition, 'seller', v_note)
    ON CONFLICT (vehicle_profile_id, panel) DO UPDATE
    SET condition = EXCLUDED.condition,
        provenance = 'seller',
        seller_evidence_note = EXCLUDED.seller_evidence_note;
    INSERT INTO vehicle.profile_fact_evidence (vehicle_profile_id, field_key, provenance, evidence_kind)
    VALUES (v_listing.vehicle_profile_id, 'body_panel', 'seller', 'seller_statement');
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.save_own_listing_vehicle_trust_contract(UUID, SMALLINT, SMALLINT, SMALLINT, NUMERIC, SMALLINT, vehicle.hybrid_type, BOOLEAN, vehicle.seller_damage_declaration, TEXT, vehicle.seller_service_declaration, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_own_listing_vehicle_trust_contract(UUID, SMALLINT, SMALLINT, SMALLINT, NUMERIC, SMALLINT, vehicle.hybrid_type, BOOLEAN, vehicle.seller_damage_declaration, TEXT, vehicle.seller_service_declaration, JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.save_own_listing_vehicle_trust_contract(UUID, SMALLINT, SMALLINT, SMALLINT, NUMERIC, SMALLINT, vehicle.hybrid_type, BOOLEAN, vehicle.seller_damage_declaration, TEXT, vehicle.seller_service_declaration, JSONB) FROM service_role;
GRANT EXECUTE ON FUNCTION public.save_own_listing_vehicle_trust_contract(UUID, SMALLINT, SMALLINT, SMALLINT, NUMERIC, SMALLINT, vehicle.hybrid_type, BOOLEAN, vehicle.seller_damage_declaration, TEXT, vehicle.seller_service_declaration, JSONB) TO authenticated;

COMMENT ON FUNCTION public.save_own_listing_vehicle_trust_contract(UUID, SMALLINT, SMALLINT, SMALLINT, NUMERIC, SMALLINT, vehicle.hybrid_type, BOOLEAN, vehicle.seller_damage_declaration, TEXT, vehicle.seller_service_declaration, JSONB) IS
  'FUNCTIONAL-02E owner-only seller vehicle specifications and trust declaration replacement; statements remain seller provenance only.';

NOTIFY pgrst, 'reload schema';
COMMIT;
