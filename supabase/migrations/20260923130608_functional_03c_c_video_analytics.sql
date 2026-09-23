BEGIN;

CREATE TABLE marketplace.video_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN ('video_impression', 'video_play', 'video_complete', 'video_error')),
  listing_id UUID NOT NULL REFERENCES marketplace.listings(id) ON DELETE RESTRICT,
  video_id UUID NOT NULL REFERENCES marketplace.listing_videos(id) ON DELETE RESTRICT,
  context TEXT NOT NULL CHECK (context IN ('video_feed')),
  locale TEXT NOT NULL CHECK (locale IN ('tr', 'en')),
  error_code TEXT CHECK (error_code IS NULL OR error_code IN ('aborted', 'network', 'decode', 'source_not_supported', 'unknown')),
  dedup_key UUID NOT NULL UNIQUE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT video_analytics_events_error_shape_chk CHECK (
    (event_type = 'video_error' AND error_code IS NOT NULL)
    OR (event_type <> 'video_error' AND error_code IS NULL)
  )
);

ALTER TABLE marketplace.video_analytics_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE marketplace.video_analytics_events FROM PUBLIC, anon, authenticated, service_role;

CREATE INDEX video_analytics_events_video_occurred_at_idx
  ON marketplace.video_analytics_events (video_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION public.record_video_analytics_event(
  p_event_type TEXT,
  p_listing_id UUID,
  p_video_id UUID,
  p_context TEXT,
  p_locale TEXT,
  p_error_code TEXT,
  p_dedup_key UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := auth.uid();
  v_stored BOOLEAN := FALSE;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401';
  END IF;

  -- Missing settings rows fail closed; no user identity is persisted with events.
  IF NOT EXISTS (
    SELECT 1 FROM identity.user_settings AS settings
    WHERE settings.user_id = v_actor_id AND settings.analytics_consent IS TRUE
  ) THEN
    RETURN FALSE;
  END IF;

  IF p_event_type NOT IN ('video_impression', 'video_play', 'video_complete', 'video_error')
     OR p_context <> 'video_feed'
     OR p_locale NOT IN ('tr', 'en')
     OR p_dedup_key IS NULL
     OR (p_event_type = 'video_error' AND p_error_code NOT IN ('aborted', 'network', 'decode', 'source_not_supported', 'unknown'))
     OR (p_event_type <> 'video_error' AND p_error_code IS NOT NULL) THEN
    RAISE EXCEPTION 'video analytics event is invalid' USING ERRCODE = 'OT422';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM marketplace.listing_videos AS video
    WHERE video.id = p_video_id
      AND video.listing_id = p_listing_id
      AND marketplace.is_listing_video_publicly_eligible(video.id)
  ) THEN
    RAISE EXCEPTION 'public video is unavailable' USING ERRCODE = 'OT404';
  END IF;

  INSERT INTO marketplace.video_analytics_events (
    event_type, listing_id, video_id, context, locale, error_code, dedup_key
  ) VALUES (
    p_event_type, p_listing_id, p_video_id, p_context, p_locale, p_error_code, p_dedup_key
  )
  ON CONFLICT (dedup_key) DO NOTHING
  RETURNING TRUE INTO v_stored;

  RETURN COALESCE(v_stored, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.record_video_analytics_event(TEXT, UUID, UUID, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_video_analytics_event(TEXT, UUID, UUID, TEXT, TEXT, TEXT, UUID) TO authenticated;

COMMENT ON TABLE marketplace.video_analytics_events IS
  'FUNCTIONAL-03C-C private, consent-gated, append-only evidence for public video playback analytics. It does not update engagement counters.';
COMMENT ON FUNCTION public.record_video_analytics_event(TEXT, UUID, UUID, TEXT, TEXT, TEXT, UUID) IS
  'FUNCTIONAL-03C-C consent-gated, lifecycle-validated analytics ingestion with page-lifecycle idempotency. Events intentionally retain no actor identity, IP, user agent, Storage reference, or arbitrary text.';

NOTIFY pgrst, 'reload schema';
COMMIT;
