BEGIN;

-- SELL-02 keeps the existing schema, but tightens public visibility around
-- moderation and allows owners to see media for their own draft/pending listings.

CREATE OR REPLACE FUNCTION vehicle.has_active_listing(p_vehicle_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = vehicle, marketplace
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM marketplace.listings l
    WHERE l.vehicle_profile_id = p_vehicle_profile_id
      AND l.status = 'active'
      AND l.moderation_status = 'active'
  );
$$;

COMMENT ON FUNCTION vehicle.has_active_listing(UUID) IS
  'RLS helper: true when a vehicle profile is attached to an active, moderation-approved listing.';

DROP POLICY IF EXISTS listings_select_active ON marketplace.listings;

CREATE POLICY listings_select_active
  ON marketplace.listings
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'active'
    AND moderation_status = 'active'
  );

DROP POLICY IF EXISTS profile_media_select_owner ON vehicle.profile_media;

CREATE POLICY profile_media_select_owner
  ON vehicle.profile_media
  FOR SELECT
  TO authenticated
  USING (vehicle.is_current_profile_owner(vehicle_profile_id));

NOTIFY pgrst, 'reload schema';

COMMIT;
