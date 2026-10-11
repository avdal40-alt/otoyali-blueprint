BEGIN;

-- Public dealer projection: deliberately excludes account, contact and review data.
CREATE OR REPLACE FUNCTION public.get_public_dealer_profile(p_dealer_id UUID)
RETURNS TABLE (display_name TEXT, avatar_url TEXT, city TEXT, description TEXT, is_verified BOOLEAN, stock_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, marketplace, pg_catalog
AS $$
  SELECT COALESCE(p.display_name, p.full_name, 'Dealer'), p.avatar_url, p.city,
         NULL::TEXT, public.is_verified_galeri(p.id),
         (SELECT count(*) FROM marketplace.listings l
          WHERE l.seller_id = p.id AND l.status = 'active' AND l.moderation_status = 'active')
  FROM public.profiles p
  WHERE p.id = p_dealer_id AND p.seller_type = 'dealer';
$$;

REVOKE ALL ON FUNCTION public.get_public_dealer_profile(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_dealer_profile(UUID) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
