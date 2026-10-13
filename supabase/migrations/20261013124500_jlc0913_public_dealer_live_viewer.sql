BEGIN;

-- JLC-0913: Public viewers receive only an active stream's display metadata
-- and already-public listings. Provider references remain private because they
-- are provisioning identifiers, not a playback contract.
CREATE OR REPLACE FUNCTION public.get_public_dealer_live_stream(p_stream_id UUID)
RETURNS TABLE (
  stream_id UUID,
  dealer_id UUID,
  title TEXT,
  status marketplace.dealer_live_status,
  started_at TIMESTAMPTZ,
  listings JSONB
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, marketplace, vehicle, pg_catalog
AS $$
  SELECT stream.id, stream.dealer_id, stream.title, stream.status, stream.started_at,
    COALESCE(jsonb_agg(jsonb_build_object(
      'listing_id', listing.id,
      'title', listing.title,
      'price_amount', listing.price_amount,
      'currency', listing.currency,
      'city', listing.city,
      'image_url', COALESCE(media.card_url, media.large_url, media.url),
      'has_video', EXISTS (
        SELECT 1 FROM marketplace.listing_videos video
        WHERE video.listing_id = listing.id
          AND marketplace.is_listing_video_publicly_eligible(video.id)
      )
    ) ORDER BY attachment.sort_order) FILTER (WHERE listing.id IS NOT NULL), '[]'::jsonb)
  FROM marketplace.dealer_live_streams stream
  LEFT JOIN marketplace.dealer_live_listing_attachments attachment ON attachment.stream_id = stream.id
  LEFT JOIN marketplace.listings listing ON listing.id = attachment.listing_id
    AND listing.seller_id = stream.dealer_id AND listing.seller_type = 'dealer'
    AND listing.status = 'active' AND listing.moderation_status = 'active'
    AND listing.archived_at IS NULL AND marketplace.is_listing_search_eligible(listing.id)
  LEFT JOIN LATERAL (
    SELECT profile_media.card_url, profile_media.large_url, profile_media.url
    FROM vehicle.profile_media profile_media
    WHERE profile_media.vehicle_profile_id = listing.vehicle_profile_id
    ORDER BY (profile_media.id = listing.cover_media_id) DESC, profile_media.is_cover DESC,
      profile_media.sort_order, profile_media.created_at
    LIMIT 1
  ) media ON TRUE
  WHERE stream.id = p_stream_id AND stream.status = 'live'
    AND public.is_verified_dealer(stream.dealer_id)
  GROUP BY stream.id;
$$;

CREATE OR REPLACE FUNCTION public.list_public_dealer_live_streams(p_dealer_id UUID, p_limit INTEGER DEFAULT 12)
RETURNS TABLE (stream_id UUID, title TEXT, started_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, marketplace, pg_catalog
AS $$
  SELECT stream.id, stream.title, stream.started_at
  FROM marketplace.dealer_live_streams stream
  WHERE stream.dealer_id = p_dealer_id AND stream.status = 'live'
    AND public.is_verified_dealer(stream.dealer_id)
  ORDER BY stream.started_at DESC, stream.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 12), 1), 24);
$$;

REVOKE ALL ON FUNCTION public.get_public_dealer_live_stream(UUID), public.list_public_dealer_live_streams(UUID, INTEGER)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_dealer_live_stream(UUID), public.list_public_dealer_live_streams(UUID, INTEGER)
  TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_dealer_live_stream(UUID) IS
  'Public-safe active Dealer Live viewer projection. It intentionally excludes provider and private dealer metadata.';
NOTIFY pgrst, 'reload schema';
COMMIT;
