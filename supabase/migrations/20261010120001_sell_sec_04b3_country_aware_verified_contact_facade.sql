BEGIN;

-- The listing contact is the seller's explicitly selected reusable verified
-- contact. Do not fall back to the legacy, Turkey-specific verification row.
CREATE OR REPLACE FUNCTION public.get_listing_seller_contact(p_listing_id UUID)
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
  IF p_listing_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT selected_contact.phone_e164
  FROM marketplace.listings AS listing
  INNER JOIN vehicle.vehicle_profiles AS vehicle_profile ON vehicle_profile.id = listing.vehicle_profile_id
  INNER JOIN vehicle.makes AS make ON make.id = vehicle_profile.make_id
  INNER JOIN vehicle.models AS model ON model.id = vehicle_profile.model_id
  INNER JOIN vehicle.makes AS parent_make ON parent_make.id = model.make_id
  INNER JOIN identity.verified_seller_contact_phones AS selected_contact
    ON selected_contact.id = listing.seller_contact_phone_id
   AND selected_contact.user_id = listing.seller_id
   AND selected_contact.is_active
   AND selected_contact.revoked_at IS NULL
  WHERE listing.id = p_listing_id
    AND listing.seller_id <> v_user_id
    AND listing.status = 'active'
    AND listing.moderation_status = 'active'
    AND vehicle_profile.profile_status = 'active'
    AND make.is_active = TRUE
    AND model.is_active = TRUE
    AND parent_make.is_active = TRUE
    AND selected_contact.phone_e164 ~ '^\\+[1-9][0-9]{1,14}$'
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_listing_seller_contact(UUID) FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.get_listing_seller_contact(UUID) TO authenticated;
COMMENT ON FUNCTION public.get_listing_seller_contact(UUID) IS
  'Authenticated phone-only facade for the listing seller''s explicitly selected active reusable verified contact.';
NOTIFY pgrst, 'reload schema';
COMMIT;
