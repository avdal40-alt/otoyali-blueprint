BEGIN;

CREATE TYPE marketplace.dealer_staff_role AS ENUM ('owner', 'manager', 'staff');

CREATE TABLE marketplace.dealer_staff_memberships (
  dealer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role marketplace.dealer_staff_role NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (dealer_id, user_id),
  CONSTRAINT dealer_staff_memberships_dealer_chk CHECK (dealer_id <> user_id)
);

CREATE INDEX dealer_staff_memberships_user_idx
  ON marketplace.dealer_staff_memberships (user_id, dealer_id);

CREATE TRIGGER dealer_staff_memberships_set_updated_at
  BEFORE UPDATE ON marketplace.dealer_staff_memberships
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

CREATE OR REPLACE FUNCTION marketplace.is_dealer_staff_member(
  p_dealer_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
  SELECT p_user_id IS NOT NULL AND EXISTS (
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
  WHERE m.dealer_id = p_dealer_id AND m.user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION marketplace.manage_dealer_staff_member(
  p_dealer_id UUID,
  p_user_id UUID,
  p_role marketplace.dealer_staff_role
)
RETURNS marketplace.dealer_staff_memberships
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE v_actor UUID := auth.uid(); v_result marketplace.dealer_staff_memberships;
BEGIN
  IF v_actor IS NULL OR p_user_id IS NULL OR p_dealer_id = p_user_id THEN
    RAISE EXCEPTION 'invalid dealer membership' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_dealer_id AND seller_type = 'dealer') THEN
    RAISE EXCEPTION 'dealer profile required' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(marketplace.dealer_staff_role_for(p_dealer_id, v_actor)::text, 'owner') NOT IN ('owner', 'manager')
     AND NOT (v_actor = p_dealer_id) THEN
    RAISE EXCEPTION 'dealer owner or manager required' USING ERRCODE = '42501';
  END IF;
  IF p_role = 'owner' THEN RAISE EXCEPTION 'owner role is reserved for dealer account' USING ERRCODE = '22023'; END IF;
  INSERT INTO marketplace.dealer_staff_memberships (dealer_id, user_id, role)
  VALUES (p_dealer_id, p_user_id, p_role)
  ON CONFLICT (dealer_id, user_id) DO UPDATE SET role = EXCLUDED.role
  RETURNING * INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.remove_dealer_staff_member(p_dealer_id UUID, p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog AS $$
BEGIN
  IF COALESCE(marketplace.dealer_staff_role_for(p_dealer_id)::text, 'owner') NOT IN ('owner', 'manager')
     AND auth.uid() <> p_dealer_id THEN
    RAISE EXCEPTION 'dealer owner or manager required' USING ERRCODE = '42501';
  END IF;
  DELETE FROM marketplace.dealer_staff_memberships WHERE dealer_id = p_dealer_id AND user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION marketplace.is_dealer_staff_member(UUID, UUID), marketplace.dealer_staff_role_for(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.manage_dealer_staff_member(UUID, UUID, marketplace.dealer_staff_role), marketplace.remove_dealer_staff_member(UUID, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.is_dealer_staff_member(UUID, UUID), marketplace.dealer_staff_role_for(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.manage_dealer_staff_member(UUID, UUID, marketplace.dealer_staff_role), marketplace.remove_dealer_staff_member(UUID, UUID) TO authenticated;

ALTER TABLE marketplace.dealer_staff_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY dealer_staff_memberships_select_member ON marketplace.dealer_staff_memberships
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR dealer_id = auth.uid());
CREATE POLICY dealer_staff_memberships_service_role_all ON marketplace.dealer_staff_memberships
  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
REVOKE ALL ON TABLE marketplace.dealer_staff_memberships FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE marketplace.dealer_staff_memberships TO authenticated;
GRANT ALL ON TABLE marketplace.dealer_staff_memberships TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
