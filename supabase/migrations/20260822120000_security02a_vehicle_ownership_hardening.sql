BEGIN;

DROP POLICY IF EXISTS profile_ownership_insert_own_created_profile ON vehicle.profile_ownership;
DROP POLICY IF EXISTS profile_ownership_update_own ON vehicle.profile_ownership;

REVOKE INSERT, UPDATE, DELETE ON vehicle.profile_ownership FROM authenticated;

-- EXPAND compatibility: the deployed client still inserts these four columns
-- directly. A later CONTRACT migration must drop this policy and revoke INSERT.
CREATE POLICY profile_ownership_insert_own_created_profile
  ON vehicle.profile_ownership
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND ownership_type = 'owner'
    AND is_current IS TRUE
    AND ended_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM vehicle.vehicle_profiles AS vp
      WHERE vp.id = profile_ownership.vehicle_profile_id
        AND vp.created_by = auth.uid()
        AND vp.profile_status = 'active'
    )
  );

GRANT INSERT (vehicle_profile_id, owner_id, ownership_type, is_current)
  ON vehicle.profile_ownership
  TO authenticated;

CREATE OR REPLACE FUNCTION public.initialize_own_vehicle_profile_ownership(
  p_vehicle_profile_id UUID
)
RETURNS TABLE (
  ownership_id UUID,
  vehicle_profile_id UUID,
  owner_id UUID,
  is_current BOOLEAN,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_vehicle vehicle.vehicle_profiles%ROWTYPE;
  v_existing vehicle.profile_ownership%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  SELECT vp.*
  INTO v_vehicle
  FROM vehicle.vehicle_profiles AS vp
  WHERE vp.id = p_vehicle_profile_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_vehicle.created_by <> v_user_id
     OR v_vehicle.profile_status <> 'active' THEN
    RAISE EXCEPTION 'vehicle profile not found' USING ERRCODE = 'OT404';
  END IF;

  SELECT po.*
  INTO v_existing
  FROM vehicle.profile_ownership AS po
  WHERE po.vehicle_profile_id = v_vehicle.id
    AND po.is_current = TRUE
  FOR UPDATE;

  IF FOUND THEN
    RAISE EXCEPTION 'vehicle profile not found' USING ERRCODE = 'OT404';
  END IF;

  BEGIN
    RETURN QUERY
    INSERT INTO vehicle.profile_ownership AS inserted_ownership (
      vehicle_profile_id,
      owner_id,
      ownership_type,
      is_current,
      started_at,
      ended_at
    )
    VALUES (
      v_vehicle.id,
      v_user_id,
      'owner',
      TRUE,
      pg_catalog.now(),
      NULL
    )
    RETURNING
      inserted_ownership.id,
      inserted_ownership.vehicle_profile_id,
      inserted_ownership.owner_id,
      inserted_ownership.is_current,
      inserted_ownership.started_at,
      inserted_ownership.ended_at;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'vehicle profile not found' USING ERRCODE = 'OT404';
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.initialize_own_vehicle_profile_ownership(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.initialize_own_vehicle_profile_ownership(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.initialize_own_vehicle_profile_ownership(UUID) FROM service_role;
REVOKE ALL ON FUNCTION public.initialize_own_vehicle_profile_ownership(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.initialize_own_vehicle_profile_ownership(UUID) TO authenticated;

COMMENT ON FUNCTION public.initialize_own_vehicle_profile_ownership(UUID) IS
  'SECURITY-02A owner-derived initial ownership initialization. Locks the creator-owned active vehicle profile, rejects existing current ownership, and never supports transfer or reassignment.';

NOTIFY pgrst, 'reload schema';
COMMIT;
