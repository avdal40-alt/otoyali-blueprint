BEGIN;

-- Retain historic Turkish/English telemetry while allowing the four Jolmod
-- launch locale identifiers after their UI dictionaries are released.
ALTER TABLE marketplace.video_analytics_events
  DROP CONSTRAINT video_analytics_events_locale_check,
  ADD CONSTRAINT video_analytics_events_locale_check
    CHECK (locale IN ('tr', 'en', 'ru', 'kk', 'zh-CN'));

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

  IF NOT EXISTS (
    SELECT 1 FROM identity.user_settings AS settings
    WHERE settings.user_id = v_actor_id AND settings.analytics_consent IS TRUE
  ) THEN
    RETURN FALSE;
  END IF;

  IF p_event_type NOT IN ('video_impression', 'video_play', 'video_complete', 'video_error')
     OR p_context <> 'video_feed'
     OR p_locale NOT IN ('tr', 'en', 'ru', 'kk', 'zh-CN')
     OR p_dedup_key IS NULL
     OR (p_event_type = 'video_error' AND p_error_code NOT IN ('aborted', 'network', 'decode', 'source_not_supported', 'unknown'))
     OR (p_event_type <> 'video_error' AND p_error_code IS NOT NULL) THEN
    RAISE EXCEPTION 'video analytics event is invalid' USING ERRCODE = 'OT422';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM marketplace.listing_videos AS video
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

COMMIT;
