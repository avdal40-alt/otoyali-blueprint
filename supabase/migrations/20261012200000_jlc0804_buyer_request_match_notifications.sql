BEGIN;

-- JLC-0804: Buyer-request criteria are owner-private, so notifications retain
-- only the opaque request/listing references needed for ownership-scoped reads.
ALTER TABLE marketplace.notifications
  ADD COLUMN buyer_request_id UUID REFERENCES marketplace.buyer_requests(id) ON DELETE CASCADE;

ALTER TABLE marketplace.notifications
  ADD CONSTRAINT notifications_buyer_request_match_refs_chk
  CHECK (
    type <> 'buyer_request_match'
    OR (buyer_request_id IS NOT NULL AND listing_id IS NOT NULL)
  );

CREATE UNIQUE INDEX notifications_buyer_request_match_dedup_idx
  ON marketplace.notifications (buyer_request_id, listing_id, type)
  WHERE type = 'buyer_request_match'
    AND buyer_request_id IS NOT NULL
    AND listing_id IS NOT NULL;

CREATE FUNCTION marketplace.generate_listing_match_notifications(p_listing_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_target RECORD;
  v_inserted INTEGER := 0;
BEGIN
  FOR v_target IN
    SELECT * FROM marketplace.list_listing_match_targets_v1(p_listing_id)
  LOOP
    IF v_target.target_kind = 'buyer_request' THEN
      INSERT INTO marketplace.notifications (user_id, type, buyer_request_id, listing_id)
      VALUES (v_target.user_id, 'buyer_request_match', v_target.target_id, p_listing_id)
      ON CONFLICT (buyer_request_id, listing_id, type)
        WHERE type = 'buyer_request_match'
          AND buyer_request_id IS NOT NULL
          AND listing_id IS NOT NULL
      DO NOTHING;
    ELSIF v_target.target_kind = 'saved_search' THEN
      INSERT INTO marketplace.notifications (user_id, type, saved_search_id, listing_id)
      VALUES (v_target.user_id, 'saved_search_match', v_target.target_id, p_listing_id)
      ON CONFLICT (saved_search_id, listing_id, type)
        WHERE type = 'saved_search_match'
          AND saved_search_id IS NOT NULL
          AND listing_id IS NOT NULL
      DO NOTHING;
    ELSE
      CONTINUE;
    END IF;

    IF FOUND THEN v_inserted := v_inserted + 1; END IF;
  END LOOP;

  RETURN v_inserted;
END;
$$;

-- This is the latest owner of the listing lifecycle trigger. Keep price-drop,
-- raised-at, publication, and canonical Search v1 behavior intact while using
-- the shared target matcher for both saved-search and buyer-request alerts.
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
     OR OLD.price_amount IS DISTINCT FROM NEW.price_amount
     OR OLD.raised_at IS DISTINCT FROM NEW.raised_at
  THEN
    PERFORM marketplace.refresh_listing_search_document(NEW.id);
    IF EXISTS (
      SELECT 1
      FROM marketplace.listing_search_documents
      WHERE listing_id = NEW.id
    ) THEN
      IF TG_OP = 'INSERT'
         OR OLD.status IS DISTINCT FROM NEW.status
         OR OLD.moderation_status IS DISTINCT FROM NEW.moderation_status
      THEN
        PERFORM marketplace.generate_listing_match_notifications(NEW.id);
      END IF;
      IF TG_OP = 'UPDATE'
         AND NEW.price_amount < OLD.price_amount
         AND NEW.status = 'active'
         AND NEW.moderation_status = 'active'
      THEN
        PERFORM marketplace.generate_price_drop_alerts_for_listing(NEW.id);
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION marketplace.generate_listing_match_notifications(UUID)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.generate_listing_match_notifications(UUID)
  TO service_role;

COMMENT ON FUNCTION marketplace.generate_listing_match_notifications(UUID) IS
  'JLC-0804 system-only owner-private buyer-request and saved-search notification producer. Canonical matcher targets and partial unique indexes prevent duplicate notification storms.';

NOTIFY pgrst, 'reload schema';

COMMIT;
