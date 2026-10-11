BEGIN;

ALTER TABLE marketplace.notifications
  DROP CONSTRAINT notifications_type_check;
ALTER TABLE marketplace.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('saved_search_match', 'price_drop'));

CREATE UNIQUE INDEX notifications_price_drop_dedup_idx
  ON marketplace.notifications (user_id, listing_id, type)
  WHERE type = 'price_drop' AND listing_id IS NOT NULL;

CREATE OR REPLACE FUNCTION marketplace.generate_price_drop_alerts_for_listing(p_listing_id UUID)
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
  IF NOT FOUND THEN RETURN 0; END IF;

  FOR v_saved_search IN
    SELECT saved.id, saved.user_id, saved.search_request
    FROM marketplace.saved_searches AS saved
    WHERE saved.alert_enabled = TRUE
      AND saved.criteria_version = 'v1'
      AND saved.search_request IS NOT NULL
      AND saved.user_id <> v_seller_id
  LOOP
    BEGIN
      v_matches := marketplace.listing_matches_search_v1(v_saved_search.search_request, p_listing_id);
    EXCEPTION WHEN OTHERS THEN
      CONTINUE;
    END;
    IF v_matches THEN
      INSERT INTO marketplace.notifications (user_id, type, saved_search_id, listing_id)
      VALUES (v_saved_search.user_id, 'price_drop', v_saved_search.id, p_listing_id)
      ON CONFLICT (user_id, listing_id, type)
        WHERE type = 'price_drop' AND listing_id IS NOT NULL
      DO NOTHING;
      IF FOUND THEN v_inserted := v_inserted + 1; END IF;
    END IF;
  END LOOP;
  RETURN v_inserted;
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.sync_listing_search_document_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = marketplace, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR OLD.status IS DISTINCT FROM NEW.status
     OR OLD.moderation_status IS DISTINCT FROM NEW.moderation_status
     OR OLD.price_amount IS DISTINCT FROM NEW.price_amount THEN
    PERFORM marketplace.refresh_listing_search_document(NEW.id);
    IF EXISTS (SELECT 1 FROM marketplace.listing_search_documents AS document WHERE document.listing_id = NEW.id) THEN
      IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.moderation_status IS DISTINCT FROM NEW.moderation_status THEN
        PERFORM marketplace.generate_saved_search_alerts_for_listing(NEW.id);
      END IF;
      IF TG_OP = 'UPDATE' AND NEW.price_amount < OLD.price_amount
         AND NEW.status = 'active' AND NEW.moderation_status = 'active' THEN
        PERFORM marketplace.generate_price_drop_alerts_for_listing(NEW.id);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION marketplace.generate_price_drop_alerts_for_listing(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.generate_price_drop_alerts_for_listing(UUID) TO service_role;
COMMENT ON FUNCTION marketplace.generate_price_drop_alerts_for_listing(UUID) IS 'System-only price-drop notifications for enabled saved-search watchers after a canonical listing price decrease.';

NOTIFY pgrst, 'reload schema';
COMMIT;
