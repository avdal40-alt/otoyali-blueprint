BEGIN;

-- A zero-kilometre listing is a distinct marketplace condition. Keep the
-- invariant at the data boundary so direct/RPC writes cannot create a listing
-- which is both marked new and carries used-vehicle mileage (or vice versa).
ALTER TABLE vehicle.vehicle_profiles
  ADD CONSTRAINT vehicle_profiles_condition_mileage_chk
  CHECK (
    condition IS NULL
    OR (condition = 'new' AND mileage_km = 0)
    OR (condition = 'used' AND mileage_km > 0)
  );

COMMENT ON CONSTRAINT vehicle_profiles_condition_mileage_chk ON vehicle.vehicle_profiles IS
  'New listings are zero-kilometre; used listings require positive mileage.';

COMMIT;
