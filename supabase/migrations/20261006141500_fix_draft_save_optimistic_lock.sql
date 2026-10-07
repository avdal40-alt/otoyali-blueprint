BEGIN;

CREATE OR REPLACE FUNCTION public.save_own_listing_edit(
  p_listing_id UUID, p_expected_listing_updated_at TIMESTAMPTZ,
  p_expected_vehicle_updated_at TIMESTAMPTZ, p_make_id UUID, p_model_id UUID,
  p_year SMALLINT, p_mileage_km INTEGER, p_condition TEXT,
  p_fuel_type vehicle.fuel_type, p_transmission vehicle.transmission_type,
  p_body_type TEXT, p_drive_type TEXT, p_color TEXT, p_engine_volume_l NUMERIC,
  p_damage_state TEXT, p_owner_count SMALLINT, p_description TEXT,
  p_price_amount_text TEXT, p_currency TEXT, p_price_negotiable BOOLEAN, p_city TEXT
)
RETURNS TABLE(saved_listing_id UUID, saved_listing_updated_at TIMESTAMPTZ,
  saved_vehicle_updated_at TIMESTAMPTZ, saved_status TEXT, saved_moderation_status TEXT,
  saved_title TEXT, saved_title_generated BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE
  v_user_id UUID := auth.uid(); v_draft BOOLEAN; v_saved RECORD;
  v_transition_updated_at TIMESTAMPTZ; v_updated TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT l.status = 'draft' AND l.moderation_status = 'draft' INTO v_draft
  FROM marketplace.listings l WHERE l.id = p_listing_id AND l.seller_id = v_user_id FOR UPDATE;

  IF COALESCE(v_draft, FALSE) THEN
    -- The legacy edit routine uses an optimistic lock. Preserve its expected
    -- timestamp after this transaction-local lifecycle bridge updates the row.
    UPDATE marketplace.listings SET moderation_status = 'pending_review'
    WHERE id = p_listing_id AND seller_id = v_user_id AND moderation_status = 'draft'
    RETURNING updated_at INTO v_transition_updated_at;
  END IF;

  SELECT * INTO v_saved FROM public.save_own_rejected_listing(
    p_listing_id, COALESCE(v_transition_updated_at, p_expected_listing_updated_at),
    p_expected_vehicle_updated_at, p_make_id, p_model_id, p_year, p_mileage_km,
    p_condition, p_fuel_type, p_transmission, p_body_type, p_drive_type, p_color,
    p_engine_volume_l, p_damage_state, p_owner_count, p_description, p_price_amount_text,
    p_currency, p_price_negotiable, p_city);

  IF COALESCE(v_draft, FALSE) THEN
    UPDATE marketplace.listings SET moderation_status = 'draft'
    WHERE id = p_listing_id AND seller_id = v_user_id AND moderation_status = 'pending_review'
    RETURNING updated_at INTO v_updated;
    IF NOT FOUND THEN RAISE EXCEPTION 'private draft transition failed' USING ERRCODE = 'OT409'; END IF;
    RETURN QUERY SELECT v_saved.saved_listing_id, v_updated, v_saved.saved_vehicle_updated_at,
      'draft', 'draft', v_saved.saved_title, v_saved.saved_title_generated;
  ELSE
    RETURN QUERY SELECT v_saved.saved_listing_id, v_saved.saved_listing_updated_at,
      v_saved.saved_vehicle_updated_at, v_saved.saved_status, v_saved.saved_moderation_status,
      v_saved.saved_title, v_saved.saved_title_generated;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
