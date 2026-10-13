BEGIN;

-- JLC-0918: a dealer/team-scoped aggregate read model. It deliberately
-- exposes counts only: raw viewer, buyer, contact, message, and provider data
-- remain in their private source domains.
CREATE FUNCTION public.list_own_dealer_cross_channel_analytics()
RETURNS TABLE (
  dealer_id UUID,
  channel TEXT,
  metric TEXT,
  event_count BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
  WITH accessible_dealers AS (
    SELECT profile.id AS dealer_id
    FROM public.profiles AS profile
    WHERE profile.id = auth.uid() AND profile.seller_type = 'dealer'
    UNION
    SELECT membership.dealer_id
    FROM marketplace.dealer_staff_memberships AS membership
    WHERE membership.user_id = auth.uid()
  ),
  listing_metrics AS (
    SELECT dealer.dealer_id, 'listing'::TEXT AS channel, 'published'::TEXT AS metric,
      COUNT(listing.id)::BIGINT AS event_count
    FROM accessible_dealers AS dealer
    LEFT JOIN marketplace.listings AS listing ON listing.seller_id = dealer.dealer_id
    GROUP BY dealer.dealer_id
    UNION ALL
    SELECT dealer.dealer_id, 'listing', event.event_type::TEXT, COUNT(event.id)::BIGINT
    FROM accessible_dealers AS dealer
    LEFT JOIN marketplace.listings AS listing ON listing.seller_id = dealer.dealer_id
    LEFT JOIN marketplace.seller_analytics_events AS event ON event.listing_id = listing.id
    WHERE event.event_type IS NOT NULL
    GROUP BY dealer.dealer_id, event.event_type
  ),
  post_metrics AS (
    SELECT dealer.dealer_id, 'post'::TEXT, 'published'::TEXT, COUNT(post.id)::BIGINT
    FROM accessible_dealers AS dealer
    LEFT JOIN marketplace.dealer_posts AS post ON post.dealer_id = dealer.dealer_id AND post.status = 'active'
    GROUP BY dealer.dealer_id
  ),
  live_metrics AS (
    SELECT dealer.dealer_id, 'live'::TEXT, 'streams'::TEXT, COUNT(stream.id)::BIGINT
    FROM accessible_dealers AS dealer
    LEFT JOIN marketplace.dealer_live_streams AS stream ON stream.dealer_id = dealer.dealer_id
    GROUP BY dealer.dealer_id
    UNION ALL
    SELECT dealer.dealer_id, 'live', 'interests', COUNT(interest.id)::BIGINT
    FROM accessible_dealers AS dealer
    LEFT JOIN marketplace.dealer_live_streams AS stream ON stream.dealer_id = dealer.dealer_id
    LEFT JOIN marketplace.dealer_live_interests AS interest ON interest.stream_id = stream.id
    GROUP BY dealer.dealer_id
  ),
  lead_metrics AS (
    SELECT dealer.dealer_id, 'lead'::TEXT, 'total'::TEXT, COUNT(lead.id)::BIGINT
    FROM accessible_dealers AS dealer
    LEFT JOIN marketplace.dealer_leads AS lead ON lead.dealer_id = dealer.dealer_id
    GROUP BY dealer.dealer_id
    UNION ALL
    SELECT dealer.dealer_id, 'lead', 'source:' || lead.source::TEXT, COUNT(lead.id)::BIGINT
    FROM accessible_dealers AS dealer
    JOIN marketplace.dealer_leads AS lead ON lead.dealer_id = dealer.dealer_id
    GROUP BY dealer.dealer_id, lead.source
    UNION ALL
    SELECT dealer.dealer_id, 'lead', 'funnel:' || lead.status::TEXT, COUNT(lead.id)::BIGINT
    FROM accessible_dealers AS dealer
    JOIN marketplace.dealer_leads AS lead ON lead.dealer_id = dealer.dealer_id
    GROUP BY dealer.dealer_id, lead.status
  )
  SELECT * FROM listing_metrics
  UNION ALL SELECT * FROM post_metrics
  UNION ALL SELECT * FROM live_metrics
  UNION ALL SELECT * FROM lead_metrics;
$$;

REVOKE ALL ON FUNCTION public.list_own_dealer_cross_channel_analytics() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_own_dealer_cross_channel_analytics() TO authenticated;

COMMENT ON FUNCTION public.list_own_dealer_cross_channel_analytics() IS
  'Returns aggregate listing, post, live, and CRM funnel/source metrics only for dealer teams containing the authenticated actor.';

NOTIFY pgrst, 'reload schema';
COMMIT;
