BEGIN;

-- The ownership contract is authoritative, but the base table still exposed
-- creator/source/lifecycle columns through a table-level UPDATE grant.
REVOKE UPDATE ON vehicle.vehicle_profiles FROM authenticated;

GRANT UPDATE (
  make_id,
  model_id,
  year,
  mileage_km,
  fuel_type,
  transmission,
  body_type,
  condition,
  drive_type,
  color,
  engine_volume_l,
  damage_state,
  owner_count
) ON vehicle.vehicle_profiles TO authenticated;

DROP POLICY IF EXISTS vehicle_profiles_insert_own ON vehicle.vehicle_profiles;
CREATE POLICY vehicle_profiles_insert_own
  ON vehicle.vehicle_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND created_source = 'manual'
    AND profile_status = 'active'
  );

COMMENT ON COLUMN vehicle.vehicle_profiles.created_by IS
  'Immutable creator identity. Ordinary authenticated clients set it only to auth.uid() on insert and cannot update it.';
COMMENT ON COLUMN vehicle.vehicle_profiles.created_source IS
  'Trusted provenance. Browser-created records are manual; other sources require a trusted ingestion path.';

NOTIFY pgrst, 'reload schema';

COMMIT;
