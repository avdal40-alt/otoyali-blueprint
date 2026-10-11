BEGIN;

-- Source tables remain authoritative. These triggers copy only the existing
-- source-row identity and timestamp into the private seller analytics model.
CREATE OR REPLACE FUNCTION marketplace.ingest_seller_analytics_from_listing_view()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  INSERT INTO marketplace.seller_analytics_events (listing_id, event_type, event_key, occurred_at, event_hour)
  VALUES (NEW.listing_id, 'view', NEW.viewer_key, NEW.viewed_at, NEW.view_hour)
  ON CONFLICT (listing_id, event_type, event_key, event_hour) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.ingest_seller_analytics_from_contact_disclosure()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  INSERT INTO marketplace.seller_analytics_events (listing_id, event_type, event_key, occurred_at, event_hour)
  SELECT NEW.listing_id, 'contact_intent', NEW.id, NEW.created_at, pg_catalog.date_trunc('hour', NEW.created_at)
  FROM marketplace.listings AS listing
  WHERE listing.id = NEW.listing_id
    AND listing.seller_id <> NEW.buyer_id
  ON CONFLICT (listing_id, event_type, event_key, event_hour) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.ingest_seller_analytics_from_favorite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  INSERT INTO marketplace.seller_analytics_events (listing_id, event_type, event_key, occurred_at, event_hour)
  SELECT NEW.listing_id, 'favorite', NEW.id, NEW.created_at, pg_catalog.date_trunc('hour', NEW.created_at)
  FROM marketplace.listings AS listing
  WHERE listing.id = NEW.listing_id
    AND listing.seller_id <> NEW.user_id
  ON CONFLICT (listing_id, event_type, event_key, event_hour) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.ingest_seller_analytics_from_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  INSERT INTO marketplace.seller_analytics_events (listing_id, event_type, event_key, occurred_at, event_hour)
  SELECT conversation.listing_id, 'message', NEW.id, NEW.created_at, pg_catalog.date_trunc('hour', NEW.created_at)
  FROM messaging.conversations AS conversation
  INNER JOIN marketplace.listings AS listing ON listing.id = conversation.listing_id
  WHERE conversation.id = NEW.conversation_id
    AND conversation.buyer_id <> conversation.seller_id
    AND NEW.sender_id = conversation.buyer_id
    AND listing.seller_id = conversation.seller_id
  ON CONFLICT (listing_id, event_type, event_key, event_hour) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION marketplace.ingest_seller_analytics_from_listing_view() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.ingest_seller_analytics_from_contact_disclosure() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.ingest_seller_analytics_from_favorite() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.ingest_seller_analytics_from_message() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER seller_analytics_from_listing_view
  AFTER INSERT ON marketplace.listing_view_events
  FOR EACH ROW EXECUTE FUNCTION marketplace.ingest_seller_analytics_from_listing_view();

CREATE TRIGGER seller_analytics_from_contact_disclosure
  AFTER INSERT ON identity.listing_seller_contact_disclosures
  FOR EACH ROW EXECUTE FUNCTION marketplace.ingest_seller_analytics_from_contact_disclosure();

CREATE TRIGGER seller_analytics_from_favorite
  AFTER INSERT ON marketplace.listing_favorites
  FOR EACH ROW EXECUTE FUNCTION marketplace.ingest_seller_analytics_from_favorite();

CREATE TRIGGER seller_analytics_from_message
  AFTER INSERT ON messaging.messages
  FOR EACH ROW EXECUTE FUNCTION marketplace.ingest_seller_analytics_from_message();

COMMENT ON FUNCTION marketplace.ingest_seller_analytics_from_listing_view() IS
  'Private trigger ingestion for listing views. Stores only source viewer key and timestamp.';
COMMENT ON FUNCTION marketplace.ingest_seller_analytics_from_contact_disclosure() IS
  'Private trigger ingestion for seller-contact disclosures. Stores no contact details.';
COMMENT ON FUNCTION marketplace.ingest_seller_analytics_from_favorite() IS
  'Private trigger ingestion for buyer favorites. Seller self-favorites are excluded.';
COMMENT ON FUNCTION marketplace.ingest_seller_analytics_from_message() IS
  'Private trigger ingestion for buyer-to-seller listing messages. Stores no message content.';

COMMIT;
