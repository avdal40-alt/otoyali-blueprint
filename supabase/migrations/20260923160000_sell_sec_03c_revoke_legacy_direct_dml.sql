BEGIN;

-- SELL-SEC-03C: the 03B server boundary is now the sole seller write path.
-- Keep SELECT and existing RLS policies for reads/defense in depth; only remove
-- authenticated table-DML compatibility grants. SECURITY DEFINER owner RPCs
-- retain their explicit authenticated EXECUTE grants from prior migrations.
REVOKE INSERT, UPDATE, DELETE ON marketplace.listings FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON vehicle.vehicle_profiles FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON vehicle.profile_ownership FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON vehicle.profile_media FROM authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
