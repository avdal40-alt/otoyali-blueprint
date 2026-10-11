BEGIN;

CREATE TABLE IF NOT EXISTS marketplace.seller_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES marketplace.listings(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'contact_intent', 'favorite', 'message')),
  event_key UUID NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_hour TIMESTAMPTZ NOT NULL DEFAULT date_trunc('hour', now()),
  UNIQUE (listing_id, event_type, event_key, event_hour)
);

CREATE INDEX IF NOT EXISTS seller_analytics_events_listing_idx
  ON marketplace.seller_analytics_events (listing_id, event_type, occurred_at DESC);

ALTER TABLE marketplace.seller_analytics_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE marketplace.seller_analytics_events FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.record_seller_analytics_event(
  p_listing_id UUID,
  p_event_type TEXT,
  p_event_key UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketplace, messaging
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_recorded BOOLEAN := FALSE;
BEGIN
  IF p_event_type NOT IN ('view', 'contact_intent', 'favorite', 'message') OR p_event_key IS NULL THEN
    RAISE EXCEPTION 'analytics event is invalid' USING ERRCODE = 'OT422';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM marketplace.listings
    WHERE id = p_listing_id AND status = 'active' AND moderation_status = 'active'
  ) THEN
    RETURN FALSE;
  END IF;

  IF p_event_type <> 'view' AND v_user_id IS NULL THEN
    RAISE EXCEPTION 'authenticated analytics event required' USING ERRCODE = 'OT401';
  END IF;

  IF p_event_type = 'contact_intent' AND NOT EXISTS (
    SELECT 1 FROM marketplace.listings WHERE id = p_listing_id AND seller_id <> v_user_id
  ) THEN RETURN FALSE; END IF;

  IF p_event_type = 'favorite' AND NOT EXISTS (
    SELECT 1 FROM marketplace.listing_favorites
    WHERE listing_id = p_listing_id AND user_id = v_user_id
  ) THEN RETURN FALSE; END IF;

  IF p_event_type = 'message' AND NOT EXISTS (
    SELECT 1 FROM messaging.conversations AS c
    WHERE c.listing_id = p_listing_id AND (c.buyer_id = v_user_id OR c.seller_id = v_user_id)
  ) THEN RETURN FALSE; END IF;

  INSERT INTO marketplace.seller_analytics_events (listing_id, event_type, event_key)
  VALUES (p_listing_id, p_event_type, p_event_key)
  ON CONFLICT (listing_id, event_type, event_key, event_hour) DO NOTHING;
  v_recorded := FOUND;
  RETURN v_recorded;
END;
$$;

REVOKE ALL ON FUNCTION public.record_seller_analytics_event(UUID, TEXT, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_seller_analytics_event(UUID, TEXT, UUID) TO anon, authenticated;

COMMENT ON TABLE marketplace.seller_analytics_events IS
  'Typed seller analytics events. Stores listing, event kind, and an opaque deduplication key only; no buyer identity, contact data, message body, IP, or user agent.';
COMMENT ON FUNCTION public.record_seller_analytics_event(UUID, TEXT, UUID) IS
  'Server-controlled seller analytics ingestion. Views are anonymous; contact, favorite, and message events require a server-validated authenticated relationship. Duplicate events are ignored per hour.';

COMMIT;
