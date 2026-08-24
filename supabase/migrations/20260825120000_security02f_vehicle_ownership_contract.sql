BEGIN;

-- SECURITY-02A EXPAND compatibility is complete: the deployed application now
-- initializes ownership exclusively through the audited initializer RPC.
DROP POLICY IF EXISTS profile_ownership_insert_own_created_profile
  ON vehicle.profile_ownership;

-- Remove both the temporary column grant and any table-level INSERT fallback.
-- Authenticated callers retain SELECT and initializer RPC execution only.
REVOKE INSERT (vehicle_profile_id, owner_id, ownership_type, is_current)
  ON vehicle.profile_ownership
  FROM authenticated;
REVOKE INSERT ON TABLE vehicle.profile_ownership FROM authenticated;

COMMIT;
