BEGIN;

-- A saved draft is not a moderation candidate. Keep the transition explicit so
-- workers and moderators only see a listing after its owner submits it.
ALTER TABLE marketplace.listings
  DROP CONSTRAINT IF EXISTS listings_moderation_status_chk;
ALTER TABLE marketplace.listings
  ADD CONSTRAINT listings_moderation_status_chk
  CHECK (moderation_status IN ('draft', 'active', 'pending_review', 'rejected', 'archived'));

-- The existing creator contains the complete catalog, ownership, seller-phone,
-- and field validation contract. This wrapper changes only the newly-created
-- listing's uncommitted moderation state in the same transaction.
CREATE OR REPLACE FUNCTION public.create_own_private_listing_draft(
  p_make_id UUID, p_model_id UUID, p_variant_id UUID, p_year SMALLINT,
  p_mileage_km INTEGER, p_condition TEXT, p_fuel_type vehicle.fuel_type,
  p_transmission vehicle.transmission_type, p_body_type TEXT, p_drive_type TEXT,
  p_color TEXT, p_engine_volume_l NUMERIC, p_damage_state TEXT,
  p_owner_count SMALLINT, p_description TEXT, p_price_amount_text TEXT,
  p_currency TEXT, p_price_negotiable BOOLEAN, p_city TEXT,
  p_city_id UUID DEFAULT NULL, p_district_id UUID DEFAULT NULL
)
RETURNS TABLE(listing_id UUID, vehicle_profile_id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_created RECORD;
BEGIN
  SELECT * INTO v_created FROM public.create_own_listing_draft(
    p_make_id, p_model_id, p_variant_id, p_year, p_mileage_km, p_condition,
    p_fuel_type, p_transmission, p_body_type, p_drive_type, p_color,
    p_engine_volume_l, p_damage_state, p_owner_count, p_description,
    p_price_amount_text, p_currency, p_price_negotiable, p_city, p_city_id,
    p_district_id
  );

  UPDATE marketplace.listings
  SET moderation_status = 'draft'
  WHERE id = v_created.listing_id
    AND seller_id = auth.uid()
    AND status = 'draft'
    AND moderation_status = 'pending_review';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'private draft transition failed' USING ERRCODE = 'OT409';
  END IF;

  RETURN QUERY SELECT v_created.listing_id, v_created.vehicle_profile_id, v_created.created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.create_own_private_listing_draft(UUID, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, UUID) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_own_private_listing_draft(UUID, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, UUID) TO authenticated;

-- New client creates must use the private-draft wrapper. Existing rows and
-- established submission paths remain backward-compatible.
REVOKE EXECUTE ON FUNCTION public.create_own_listing_draft(UUID, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT, UUID, UUID) FROM authenticated;

CREATE OR REPLACE FUNCTION public.submit_own_listing_for_review(p_listing_id UUID)
RETURNS TABLE(listing_id UUID, status TEXT, moderation_status TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_user_id UUID := auth.uid(); v_listing marketplace.listings%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT * INTO v_listing FROM marketplace.listings WHERE id = p_listing_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing not found' USING ERRCODE = 'OT404'; END IF;
  IF v_listing.seller_id <> v_user_id
     OR NOT vehicle.is_current_profile_owner(v_listing.vehicle_profile_id, v_user_id) THEN
    RAISE EXCEPTION 'listing owner authorization required' USING ERRCODE = 'OT403';
  END IF;
  IF v_listing.status <> 'draft' OR v_listing.moderation_status <> 'draft' OR v_listing.archived_at IS NOT NULL THEN
    RAISE EXCEPTION 'illegal listing lifecycle transition' USING ERRCODE = 'OT409';
  END IF;
  UPDATE marketplace.listings
  SET moderation_status = 'pending_review', moderation_note = NULL,
      rejection_reason = NULL, moderated_by = NULL, moderated_at = NULL
  WHERE id = p_listing_id AND status = 'draft' AND moderation_status = 'draft'
  RETURNING id, status::TEXT, moderation_status INTO listing_id, status, moderation_status;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing lifecycle changed during submit' USING ERRCODE = 'OT409'; END IF;
  INSERT INTO public.admin_audit_logs(actor_user_id, action, entity_type, entity_id, metadata)
  VALUES (v_user_id, 'listing.submit', 'listing', p_listing_id,
    jsonb_build_object('previous_status', 'draft', 'previous_moderation_status', 'draft', 'new_status', 'draft', 'new_moderation_status', 'pending_review'));
  RETURN NEXT;
END;
$$;

-- Preserve the existing editor contract for private drafts without changing
-- rejected or active-listing edit behavior.
CREATE OR REPLACE FUNCTION public.get_own_listing_for_edit(p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_user_id UUID := auth.uid(); v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT jsonb_build_object(
    'listing', jsonb_build_object('id', l.id, 'title', l.title, 'description', l.description,
      'price_amount', l.price_amount::TEXT, 'currency', l.currency::TEXT,
      'price_negotiable', l.price_negotiable, 'city', l.city, 'seller_type', l.seller_type,
      'title_generated', l.title_generated, 'rejection_reason', l.rejection_reason,
      'moderation_note', l.moderation_note, 'updated_at', l.updated_at,
      'vehicle_profile_id', l.vehicle_profile_id, 'status', l.status,
      'moderation_status', l.moderation_status),
    'vehicle', jsonb_build_object('make_id', vp.make_id, 'model_id', vp.model_id,
      'year', vp.year, 'mileage_km', vp.mileage_km, 'condition', vp.condition,
      'fuel_type', vp.fuel_type, 'transmission', vp.transmission, 'body_type', vp.body_type,
      'drive_type', vp.drive_type, 'color', vp.color, 'engine_volume_l', vp.engine_volume_l,
      'damage_state', vp.damage_state, 'owner_count', vp.owner_count, 'updated_at', vp.updated_at),
    'media', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', pm.id, 'url', pm.url,
      'thumb_url', pm.thumb_url, 'card_url', pm.card_url, 'large_url', pm.large_url,
      'is_cover', pm.is_cover, 'sort_order', pm.sort_order) ORDER BY pm.sort_order, pm.created_at, pm.id)
      FROM vehicle.profile_media pm WHERE pm.vehicle_profile_id = l.vehicle_profile_id), '[]'::jsonb))
  INTO v_result
  FROM marketplace.listings l JOIN vehicle.vehicle_profiles vp ON vp.id = l.vehicle_profile_id
  WHERE l.id = p_listing_id AND l.seller_id = v_user_id AND vp.created_by = v_user_id
    AND vehicle.is_current_profile_owner(vp.id, v_user_id) AND l.archived_at IS NULL
    AND l.status = 'draft' AND l.moderation_status = 'draft';
  IF v_result IS NOT NULL THEN RETURN v_result; END IF;
  RETURN public.get_own_rejected_listing_for_edit(p_listing_id);
END;
$$;

REVOKE ALL ON FUNCTION public.get_own_listing_for_edit(UUID) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_own_listing_for_edit(UUID) TO authenticated;

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
  saved_vehicle_updated_at TIMESTAMPTZ, saved_status TEXT,
  saved_moderation_status TEXT, saved_title TEXT, saved_title_generated BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
DECLARE v_user_id UUID := auth.uid(); v_draft BOOLEAN; v_saved RECORD; v_updated TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT l.status = 'draft' AND l.moderation_status = 'draft' INTO v_draft
  FROM marketplace.listings l WHERE l.id = p_listing_id AND l.seller_id = v_user_id FOR UPDATE;
  IF COALESCE(v_draft, FALSE) THEN
    -- Reuse the mature validation/owner-update implementation. The temporary
    -- state exists only inside this transaction and is restored before commit.
    UPDATE marketplace.listings SET moderation_status = 'pending_review'
    WHERE id = p_listing_id AND seller_id = v_user_id AND moderation_status = 'draft';
  END IF;
  SELECT * INTO v_saved FROM public.save_own_rejected_listing(
    p_listing_id, p_expected_listing_updated_at, p_expected_vehicle_updated_at,
    p_make_id, p_model_id, p_year, p_mileage_km, p_condition, p_fuel_type,
    p_transmission, p_body_type, p_drive_type, p_color, p_engine_volume_l,
    p_damage_state, p_owner_count, p_description, p_price_amount_text,
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

REVOKE ALL ON FUNCTION public.save_own_listing_edit(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.save_own_listing_edit(UUID, TIMESTAMPTZ, TIMESTAMPTZ, UUID, UUID, SMALLINT, INTEGER, TEXT, vehicle.fuel_type, vehicle.transmission_type, TEXT, TEXT, TEXT, NUMERIC, TEXT, SMALLINT, TEXT, TEXT, TEXT, BOOLEAN, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
