BEGIN;

-- JLC-0505: hashtextextended returns bigint. PostgreSQL provides advisory
-- transaction locks for either bigint or integer/integer keys, not mixed keys.
-- Retain the buyer/listing-specific lock with the supported bigint overload.
CREATE OR REPLACE FUNCTION public.reserve_listing_seller_contact_disclosure(p_listing_id UUID)
RETURNS TABLE(allowed BOOLEAN)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = '' AS $$
DECLARE
  v_buyer_id UUID := auth.uid();
  v_now TIMESTAMPTZ := pg_catalog.now();
BEGIN
  IF v_buyer_id IS NULL OR p_listing_id IS NULL THEN
    RETURN QUERY SELECT FALSE;
    RETURN;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_buyer_id::TEXT || ':' || p_listing_id::TEXT, 0)
  );

  IF NOT EXISTS (
    SELECT 1
    FROM marketplace.listings AS listing
    INNER JOIN vehicle.vehicle_profiles AS vehicle_profile ON vehicle_profile.id = listing.vehicle_profile_id
    INNER JOIN vehicle.makes AS make ON make.id = vehicle_profile.make_id
    INNER JOIN vehicle.models AS model ON model.id = vehicle_profile.model_id
    INNER JOIN vehicle.makes AS parent_make ON parent_make.id = model.make_id
    INNER JOIN identity.verified_seller_contact_phones AS contact
      ON contact.id = listing.seller_contact_phone_id
     AND contact.user_id = listing.seller_id
     AND contact.is_active
     AND contact.revoked_at IS NULL
     AND contact.phone_e164 ~ '^[+][1-9][0-9]{1,14}$'
    WHERE listing.id = p_listing_id
      AND listing.seller_id <> v_buyer_id
      AND listing.status = 'active'
      AND listing.moderation_status = 'active'
      AND vehicle_profile.profile_status = 'active'
      AND make.is_active
      AND model.is_active
      AND parent_make.is_active
  ) THEN
    RETURN QUERY SELECT FALSE;
    RETURN;
  END IF;

  IF (SELECT count(*) FROM identity.listing_seller_contact_disclosures
      WHERE buyer_id = v_buyer_id AND created_at >= v_now - INTERVAL '1 hour') >= 20
     OR (SELECT count(*) FROM identity.listing_seller_contact_disclosures
      WHERE buyer_id = v_buyer_id AND created_at >= v_now - INTERVAL '1 day') >= 100 THEN
    RETURN QUERY SELECT FALSE;
    RETURN;
  END IF;

  INSERT INTO identity.listing_seller_contact_disclosures (buyer_id, listing_id)
  VALUES (v_buyer_id, p_listing_id);

  RETURN QUERY SELECT TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_listing_seller_contact_disclosure(UUID)
  FROM PUBLIC, anon, service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_listing_seller_contact_disclosure(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
