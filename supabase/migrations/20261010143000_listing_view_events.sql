BEGIN;

CREATE TABLE IF NOT EXISTS marketplace.listing_view_events (
  listing_id UUID NOT NULL REFERENCES marketplace.listings(id) ON DELETE CASCADE,
  viewer_key UUID NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  view_hour TIMESTAMPTZ NOT NULL DEFAULT date_trunc('hour', now()),
  PRIMARY KEY (listing_id, viewer_key, view_hour)
);

CREATE INDEX IF NOT EXISTS listing_view_events_recent_idx
  ON marketplace.listing_view_events (listing_id, viewer_key, viewed_at DESC);

ALTER TABLE marketplace.listing_view_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.record_listing_view(p_listing_id UUID, p_viewer_key UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketplace
AS $$
DECLARE
  v_recorded BOOLEAN := FALSE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM marketplace.listings
    WHERE id = p_listing_id AND status = 'active' AND moderation_status = 'active'
  ) THEN
    RETURN FALSE;
  END IF;

  INSERT INTO marketplace.listing_view_events (listing_id, viewer_key, viewed_at, view_hour)
  VALUES (p_listing_id, p_viewer_key, now(), date_trunc('hour', now()))
  ON CONFLICT (listing_id, viewer_key, view_hour) DO NOTHING;

  IF FOUND THEN
    UPDATE marketplace.listings SET views_count = views_count + 1 WHERE id = p_listing_id;
    v_recorded := TRUE;
  END IF;
  RETURN v_recorded;
END;
$$;

REVOKE ALL ON FUNCTION public.record_listing_view(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_listing_view(UUID, UUID) TO anon, authenticated;
COMMENT ON FUNCTION public.record_listing_view(UUID, UUID) IS
  'Server-controlled aggregate listing view increment, limited to one browser key per listing per hour.';

COMMIT;
