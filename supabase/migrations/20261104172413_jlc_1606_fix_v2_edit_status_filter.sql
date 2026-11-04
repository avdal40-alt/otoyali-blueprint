BEGIN;

-- Rejected listings use the canonical removed/rejected lifecycle pair. The
-- prior V2 hydration function instead compared listing_status to a nonexistent
-- rejected enum value.
CREATE OR REPLACE FUNCTION public.get_own_listing_for_edit(p_listing_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketplace, vehicle, pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='OT401'; END IF;

  SELECT jsonb_build_object(
    'listing', jsonb_build_object(
      'id', l.id, 'title', l.title, 'description', l.description,
      'price_amount', l.price_amount::TEXT, 'currency', l.currency::TEXT,
      'price_negotiable', l.price_negotiable, 'city', l.city, 'city_id', l.city_id,
      'seller_type', l.seller_type, 'seller_contact_phone_id', l.seller_contact_phone_id,
      'title_generated', l.title_generated, 'rejection_reason', l.rejection_reason,
      'moderation_note', l.moderation_note, 'updated_at', l.updated_at,
      'vehicle_profile_id', l.vehicle_profile_id, 'status', l.status,
      'moderation_status', l.moderation_status, 'vehicle_category', l.vehicle_category::TEXT,
      'listing_purpose', l.listing_purpose::TEXT, 'rental_price_per_day', l.rental_price_per_day::TEXT,
      'rental_price_per_month', l.rental_price_per_month::TEXT, 'minimum_rental_days', l.minimum_rental_days,
      'security_deposit_amount', l.security_deposit_amount::TEXT, 'with_driver_or_operator', l.with_driver_or_operator,
      'v2_edit', true
    ),
    'vehicle', jsonb_build_object(
      'make_id', vp.make_id, 'model_id', vp.model_id, 'year', vp.year,
      'mileage_km', vp.mileage_km, 'condition', vp.condition, 'fuel_type', vp.fuel_type,
      'transmission', vp.transmission, 'body_type', vp.body_type, 'drive_type', vp.drive_type,
      'color', vp.color, 'engine_volume_l', vp.engine_volume_l, 'damage_state', vp.damage_state,
      'owner_count', vp.owner_count, 'updated_at', vp.updated_at
    ),
    'details', jsonb_build_object(
      'truck_body_type', d.truck_body_type, 'bus_type', d.bus_type, 'trailer_type', d.trailer_type,
      'machinery_type', d.machinery_type, 'payload_capacity_kg', d.payload_capacity_kg,
      'gross_weight_kg', d.gross_weight_kg, 'axle_count', d.axle_count, 'seat_count', d.seat_count,
      'operating_hours', d.operating_hours
    ),
    'media', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', pm.id, 'url', pm.url, 'thumb_url', pm.thumb_url, 'card_url', pm.card_url,
      'large_url', pm.large_url, 'original_url', pm.original_url, 'is_cover', pm.is_cover,
      'sort_order', pm.sort_order) ORDER BY pm.sort_order, pm.created_at, pm.id)
      FROM vehicle.profile_media pm WHERE pm.vehicle_profile_id=l.vehicle_profile_id), '[]'::jsonb)
  ) INTO v_result
  FROM marketplace.listings l
  JOIN vehicle.vehicle_profiles vp ON vp.id=l.vehicle_profile_id
  JOIN marketplace.listing_vehicle_category_details d ON d.listing_id=l.id
  WHERE l.id=p_listing_id AND l.seller_id=v_user_id AND vp.created_by=v_user_id
    AND vehicle.is_current_profile_owner(vp.id, v_user_id) AND l.archived_at IS NULL
    AND (
      (l.status = 'draft' AND l.moderation_status = 'draft')
      OR (l.status = 'removed' AND l.moderation_status = 'rejected')
    );

  IF v_result IS NOT NULL THEN RETURN v_result; END IF;
  RETURN public.get_own_rejected_listing_for_edit(p_listing_id);
END;
$$;

REVOKE ALL ON FUNCTION public.get_own_listing_for_edit(UUID) FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_listing_for_edit(UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';

COMMIT;
