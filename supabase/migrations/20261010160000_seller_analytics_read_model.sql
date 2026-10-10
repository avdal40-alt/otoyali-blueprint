BEGIN;

CREATE OR REPLACE FUNCTION public.list_own_seller_analytics()
RETURNS TABLE (listing_id UUID, views BIGINT, contact_intents BIGINT, favorites BIGINT, messages BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, marketplace
AS $$
  SELECT l.id,
    COUNT(*) FILTER (WHERE e.event_type = 'view'),
    COUNT(*) FILTER (WHERE e.event_type = 'contact_intent'),
    COUNT(*) FILTER (WHERE e.event_type = 'favorite'),
    COUNT(*) FILTER (WHERE e.event_type = 'message')
  FROM marketplace.listings AS l
  LEFT JOIN marketplace.seller_analytics_events AS e ON e.listing_id = l.id
  WHERE l.seller_id = auth.uid()
  GROUP BY l.id;
$$;

REVOKE ALL ON FUNCTION public.list_own_seller_analytics() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_own_seller_analytics() TO authenticated;

COMMENT ON FUNCTION public.list_own_seller_analytics() IS
  'Returns aggregate analytics only for listings owned by the authenticated seller.';

COMMIT;
