BEGIN;

CREATE TABLE marketplace.dealer_follows (
  dealer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (dealer_id, follower_id),
  CONSTRAINT dealer_follows_dealer_check CHECK (dealer_id <> follower_id)
);

CREATE INDEX dealer_follows_follower_idx ON marketplace.dealer_follows (follower_id, created_at DESC);
ALTER TABLE marketplace.dealer_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY dealer_follows_select_own ON marketplace.dealer_follows
  FOR SELECT TO authenticated USING (follower_id = auth.uid());
REVOKE ALL ON marketplace.dealer_follows FROM PUBLIC, anon, authenticated;
GRANT SELECT ON marketplace.dealer_follows TO authenticated;

-- The preceding public profile RPC has fewer OUT columns. PostgreSQL cannot
-- replace a function while changing its composite return type; this migration
-- is transactional and no dependent database objects exist at this point.
DROP FUNCTION public.get_public_dealer_profile(UUID);

CREATE OR REPLACE FUNCTION public.toggle_dealer_follow(p_dealer_id UUID)
RETURNS TABLE (is_following BOOLEAN, follower_count BIGINT)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, marketplace, pg_catalog
AS $$
DECLARE v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = '28000'; END IF;
  IF p_dealer_id = v_user OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_dealer_id AND seller_type = 'dealer'
  ) THEN RAISE EXCEPTION 'dealer not found' USING ERRCODE = 'P0002'; END IF;
  IF EXISTS (SELECT 1 FROM marketplace.dealer_follows WHERE dealer_id = p_dealer_id AND follower_id = v_user) THEN
    DELETE FROM marketplace.dealer_follows WHERE dealer_id = p_dealer_id AND follower_id = v_user;
  ELSE
    INSERT INTO marketplace.dealer_follows (dealer_id, follower_id) VALUES (p_dealer_id, v_user);
  END IF;
  RETURN QUERY SELECT EXISTS (SELECT 1 FROM marketplace.dealer_follows WHERE dealer_id = p_dealer_id AND follower_id = v_user),
    (SELECT count(*) FROM marketplace.dealer_follows WHERE dealer_id = p_dealer_id);
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_dealer_follow(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_dealer_follow(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_dealer_profile(p_dealer_id UUID)
RETURNS TABLE (display_name TEXT, avatar_url TEXT, city TEXT, description TEXT, is_verified BOOLEAN, stock_count BIGINT, follower_count BIGINT, is_following BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, marketplace, pg_catalog
AS $$
  SELECT COALESCE(p.display_name, p.full_name, 'Dealer'), p.avatar_url, p.city, NULL::TEXT,
    public.is_verified_galeri(p.id),
    (SELECT count(*) FROM marketplace.listings l WHERE l.seller_id = p.id AND l.status = 'active' AND l.moderation_status = 'active'),
    (SELECT count(*) FROM marketplace.dealer_follows f WHERE f.dealer_id = p.id),
    (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM marketplace.dealer_follows f WHERE f.dealer_id = p.id AND f.follower_id = auth.uid()))
  FROM public.profiles p WHERE p.id = p_dealer_id AND p.seller_type = 'dealer';
$$;
REVOKE ALL ON FUNCTION public.get_public_dealer_profile(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_dealer_profile(UUID) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
