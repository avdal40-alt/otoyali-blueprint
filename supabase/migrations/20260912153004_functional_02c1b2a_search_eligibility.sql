BEGIN;
CREATE FUNCTION marketplace.is_listing_search_eligible(p_listing_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = marketplace, vehicle, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1 FROM marketplace.listings AS l
    JOIN vehicle.vehicle_profiles AS vp ON vp.id = l.vehicle_profile_id
    JOIN vehicle.makes AS ma ON ma.id = vp.make_id
    JOIN vehicle.models AS mo ON mo.id = vp.model_id
    WHERE l.id = p_listing_id
      AND l.status = 'active'
      AND l.moderation_status = 'active'
      AND vp.profile_status = 'active'
      AND ma.is_active = TRUE
      AND mo.is_active = TRUE
  );
$$;
REVOKE ALL ON FUNCTION marketplace.is_listing_search_eligible(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION marketplace.is_listing_search_eligible(UUID) FROM anon;
REVOKE ALL ON FUNCTION marketplace.is_listing_search_eligible(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION marketplace.is_listing_search_eligible(UUID) TO service_role;
COMMENT ON FUNCTION marketplace.is_listing_search_eligible(UUID) IS 'Internal read-only canonical predicate for Search publication eligibility.';
NOTIFY pgrst, 'reload schema';
COMMIT;
