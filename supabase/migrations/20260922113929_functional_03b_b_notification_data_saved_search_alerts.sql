BEGIN;

CREATE TABLE marketplace.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type = 'saved_search_match'),
  saved_search_id UUID REFERENCES marketplace.saved_searches(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES marketplace.listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  CONSTRAINT notifications_saved_search_match_refs_chk CHECK (
    type <> 'saved_search_match' OR (saved_search_id IS NOT NULL AND listing_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX notifications_saved_search_match_dedup_idx
  ON marketplace.notifications (saved_search_id, listing_id, type)
  WHERE type = 'saved_search_match' AND saved_search_id IS NOT NULL AND listing_id IS NOT NULL;
CREATE INDEX notifications_owner_cursor_idx
  ON marketplace.notifications (user_id, created_at DESC, id DESC);
CREATE INDEX saved_searches_alert_enabled_idx
  ON marketplace.saved_searches (user_id, id)
  WHERE alert_enabled = TRUE AND criteria_version = 'v1' AND search_request IS NOT NULL;

ALTER TABLE marketplace.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_service_role_all
  ON marketplace.notifications FOR ALL TO service_role
  USING (TRUE) WITH CHECK (TRUE);
REVOKE ALL ON TABLE marketplace.notifications FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON TABLE marketplace.notifications TO service_role;

CREATE FUNCTION marketplace.generate_saved_search_alerts_for_listing(p_listing_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_seller_id UUID;
  v_saved_search RECORD;
  v_matches BOOLEAN;
  v_inserted INTEGER := 0;
BEGIN
  SELECT listing.seller_id INTO v_seller_id
  FROM marketplace.listings AS listing
  WHERE listing.id = p_listing_id;

  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM marketplace.listing_search_documents AS document
    WHERE document.listing_id = p_listing_id
  ) THEN
    RETURN 0;
  END IF;

  FOR v_saved_search IN
    SELECT saved.id, saved.user_id, saved.search_request
    FROM marketplace.saved_searches AS saved
    WHERE saved.alert_enabled = TRUE
      AND saved.criteria_version = 'v1'
      AND saved.search_request IS NOT NULL
      AND saved.user_id <> v_seller_id
  LOOP
    BEGIN
      v_matches := marketplace.listing_matches_search_v1(
        v_saved_search.search_request,
        p_listing_id
      );
    EXCEPTION WHEN OTHERS THEN
      -- A legacy or malformed durable row must not block publication or cause
      -- guessed alert semantics. Canonical saved searches are validated at write time.
      CONTINUE;
    END;

    IF v_matches THEN
      INSERT INTO marketplace.notifications (user_id, type, saved_search_id, listing_id)
      VALUES (v_saved_search.user_id, 'saved_search_match', v_saved_search.id, p_listing_id)
      ON CONFLICT (saved_search_id, listing_id, type)
        WHERE type = 'saved_search_match' AND saved_search_id IS NOT NULL AND listing_id IS NOT NULL
      DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END IF;
  END LOOP;

  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION marketplace.sync_listing_search_document_lifecycle()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION marketplace.sync_listing_search_document_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = marketplace, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR OLD.status IS DISTINCT FROM NEW.status
     OR OLD.moderation_status IS DISTINCT FROM NEW.moderation_status THEN
    PERFORM marketplace.refresh_listing_search_document(NEW.id);
    IF EXISTS (
      SELECT 1 FROM marketplace.listing_search_documents AS document
      WHERE document.listing_id = NEW.id
    ) THEN
      PERFORM marketplace.generate_saved_search_alerts_for_listing(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE FUNCTION marketplace.list_own_notifications(
  p_limit INTEGER DEFAULT 20,
  p_before_created_at TIMESTAMPTZ DEFAULT NULL,
  p_before_id UUID DEFAULT NULL
)
RETURNS TABLE (
  notification_id UUID,
  notification_type TEXT,
  saved_search_id UUID,
  listing_id UUID,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication is required' USING ERRCODE = 'OT401'; END IF;
  IF p_limit NOT BETWEEN 1 AND 50
     OR (p_before_created_at IS NULL) <> (p_before_id IS NULL) THEN
    RAISE EXCEPTION 'notification cursor is invalid' USING ERRCODE = 'OT422';
  END IF;
  RETURN QUERY
  SELECT notification.id, notification.type, notification.saved_search_id,
    notification.listing_id, notification.created_at, notification.read_at
  FROM marketplace.notifications AS notification
  WHERE notification.user_id = v_user_id
    AND (p_before_id IS NULL OR (notification.created_at, notification.id) < (p_before_created_at, p_before_id))
  ORDER BY notification.created_at DESC, notification.id DESC
  LIMIT p_limit;
END;
$$;

CREATE FUNCTION marketplace.count_own_unread_notifications()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication is required' USING ERRCODE = 'OT401'; END IF;
  RETURN (SELECT count(*)::INTEGER FROM marketplace.notifications AS notification WHERE notification.user_id = v_user_id AND notification.read_at IS NULL);
END;
$$;

CREATE FUNCTION marketplace.mark_own_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication is required' USING ERRCODE = 'OT401'; END IF;
  UPDATE marketplace.notifications AS notification
  SET read_at = COALESCE(notification.read_at, now())
  WHERE notification.id = p_notification_id AND notification.user_id = v_user_id;
  RETURN FOUND;
END;
$$;

CREATE FUNCTION marketplace.mark_all_own_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_user_id UUID := auth.uid(); v_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'authentication is required' USING ERRCODE = 'OT401'; END IF;
  UPDATE marketplace.notifications AS notification
  SET read_at = now()
  WHERE notification.user_id = v_user_id AND notification.read_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION marketplace.generate_saved_search_alerts_for_listing(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.generate_saved_search_alerts_for_listing(UUID) TO service_role;
REVOKE ALL ON FUNCTION marketplace.list_own_notifications(INTEGER, TIMESTAMPTZ, UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.count_own_unread_notifications() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.mark_own_notification_read(UUID) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.mark_all_own_notifications_read() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.list_own_notifications(INTEGER, TIMESTAMPTZ, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.count_own_unread_notifications() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.mark_own_notification_read(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.mark_all_own_notifications_read() TO authenticated, service_role;

COMMENT ON TABLE marketplace.notifications IS 'Private in-app notification records. This stage stores only saved-search match references, never delivery payloads or private listing, seller, message, report, or moderation data.';
COMMENT ON FUNCTION marketplace.generate_saved_search_alerts_for_listing(UUID) IS 'FUNCTIONAL-03B-B system-only saved-search alert generation through canonical single-listing Search v1 matching.';
COMMENT ON FUNCTION marketplace.list_own_notifications(INTEGER, TIMESTAMPTZ, UUID) IS 'FUNCTIONAL-03B-B owner-derived bounded notification history facade.';

NOTIFY pgrst, 'reload schema';
COMMIT;
