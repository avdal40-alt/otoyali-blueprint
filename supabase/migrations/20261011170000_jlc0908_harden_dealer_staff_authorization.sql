BEGIN;

-- JLC-0908 follow-up: membership absence must never imply dealer ownership.
-- The dealer account is the only owner; managers may operate staff rows only.
CREATE OR REPLACE FUNCTION marketplace.manage_dealer_staff_member(
  p_dealer_id UUID,
  p_user_id UUID,
  p_role marketplace.dealer_staff_role
)
RETURNS marketplace.dealer_staff_memberships
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_actor_is_owner BOOLEAN;
  v_target_role marketplace.dealer_staff_role;
  v_result marketplace.dealer_staff_memberships;
BEGIN
  IF v_actor IS NULL OR p_user_id IS NULL OR p_dealer_id IS NULL OR p_dealer_id = p_user_id THEN
    RAISE EXCEPTION 'invalid dealer membership' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_dealer_id AND seller_type = 'dealer') THEN
    RAISE EXCEPTION 'dealer profile required' USING ERRCODE = '42501';
  END IF;

  v_actor_is_owner := v_actor = p_dealer_id;
  IF NOT v_actor_is_owner
     AND marketplace.dealer_staff_role_for(p_dealer_id, v_actor) IS DISTINCT FROM 'manager'::marketplace.dealer_staff_role THEN
    RAISE EXCEPTION 'dealer owner or manager required' USING ERRCODE = '42501';
  END IF;
  IF p_role = 'owner' THEN
    RAISE EXCEPTION 'owner role is reserved for dealer account' USING ERRCODE = '22023';
  END IF;

  IF NOT v_actor_is_owner THEN
    SELECT role INTO v_target_role
    FROM marketplace.dealer_staff_memberships
    WHERE dealer_id = p_dealer_id AND user_id = p_user_id
    FOR UPDATE;
    IF p_role <> 'staff'::marketplace.dealer_staff_role
       OR (v_target_role IS NOT NULL AND v_target_role <> 'staff'::marketplace.dealer_staff_role) THEN
      RAISE EXCEPTION 'managers may manage staff role only' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO marketplace.dealer_staff_memberships (dealer_id, user_id, role)
  VALUES (p_dealer_id, p_user_id, p_role)
  ON CONFLICT (dealer_id, user_id) DO UPDATE SET role = EXCLUDED.role
  RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.remove_dealer_staff_member(
  p_dealer_id UUID,
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_actor_is_owner BOOLEAN;
  v_target_role marketplace.dealer_staff_role;
BEGIN
  IF v_actor IS NULL OR p_user_id IS NULL OR p_dealer_id IS NULL THEN
    RAISE EXCEPTION 'invalid dealer membership' USING ERRCODE = '22023';
  END IF;
  v_actor_is_owner := v_actor = p_dealer_id;
  IF NOT v_actor_is_owner
     AND marketplace.dealer_staff_role_for(p_dealer_id, v_actor) IS DISTINCT FROM 'manager'::marketplace.dealer_staff_role THEN
    RAISE EXCEPTION 'dealer owner or manager required' USING ERRCODE = '42501';
  END IF;

  IF NOT v_actor_is_owner THEN
    SELECT role INTO v_target_role
    FROM marketplace.dealer_staff_memberships
    WHERE dealer_id = p_dealer_id AND user_id = p_user_id
    FOR UPDATE;
    IF v_target_role IS DISTINCT FROM 'staff'::marketplace.dealer_staff_role THEN
      RAISE EXCEPTION 'managers may remove staff role only' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- This is the narrowly authorized membership-removal path; table grants
  -- still prevent direct authenticated DELETE access.
  IF p_dealer_id IS NOT NULL THEN DELETE FROM marketplace.dealer_staff_memberships
    WHERE dealer_id = p_dealer_id AND user_id = p_user_id; END IF;
END;
$$;

-- Helpers may only disclose the caller's own membership, except to the dealer
-- account that owns the organization. The manage functions use the caller's
-- own identity, so this also prevents membership probing by other accounts.
CREATE OR REPLACE FUNCTION marketplace.is_dealer_staff_member(
  p_dealer_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
  SELECT p_user_id IS NOT NULL
    AND (p_user_id = auth.uid() OR auth.uid() = p_dealer_id)
    AND EXISTS (
      SELECT 1 FROM marketplace.dealer_staff_memberships m
      WHERE m.dealer_id = p_dealer_id AND m.user_id = p_user_id
    );
$$;

CREATE OR REPLACE FUNCTION marketplace.dealer_staff_role_for(
  p_dealer_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS marketplace.dealer_staff_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
  SELECT m.role FROM marketplace.dealer_staff_memberships m
  WHERE m.dealer_id = p_dealer_id AND m.user_id = p_user_id
    AND p_user_id IS NOT NULL
    AND (p_user_id = auth.uid() OR auth.uid() = p_dealer_id);
$$;

NOTIFY pgrst, 'reload schema';
COMMIT;
