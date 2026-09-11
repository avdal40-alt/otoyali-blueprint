BEGIN;

-- public.profiles remains owner-readable only. This definer exposes one
-- canonical phone for one currently public listing without broadening profile
-- RLS or adding private fields to a public view.
CREATE FUNCTION public.get_listing_seller_contact(p_listing_id UUID)
RETURNS TABLE (phone TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  IF p_listing_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT seller.phone
  FROM marketplace.listings AS listing
  INNER JOIN vehicle.vehicle_profiles AS vehicle_profile
    ON vehicle_profile.id = listing.vehicle_profile_id
  INNER JOIN vehicle.makes AS make
    ON make.id = vehicle_profile.make_id
  INNER JOIN vehicle.models AS model
    ON model.id = vehicle_profile.model_id
  INNER JOIN vehicle.makes AS parent_make
    ON parent_make.id = model.make_id
  INNER JOIN public.profiles AS seller
    ON seller.id = listing.seller_id
  WHERE listing.id = p_listing_id
    AND listing.seller_id <> v_user_id
    AND listing.status = 'active'
    AND listing.moderation_status = 'active'
    AND vehicle_profile.profile_status = 'active'
    AND make.is_active = TRUE
    AND model.is_active = TRUE
    AND parent_make.is_active = TRUE
    AND seller.phone IS NOT NULL
    AND seller.phone ~ '^\+[1-9][0-9]{1,14}$'
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_listing_seller_contact(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_listing_seller_contact(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.get_listing_seller_contact(UUID) FROM service_role;
REVOKE ALL ON FUNCTION public.get_listing_seller_contact(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_listing_seller_contact(UUID) TO authenticated;

COMMENT ON FUNCTION public.get_listing_seller_contact(UUID) IS
  'Authenticated phone-only contact facade for one eligible public listing. Returns no row for unavailable, ineligible, or own listings.';

NOTIFY pgrst, 'reload schema';

COMMIT;
