BEGIN;

CREATE FUNCTION marketplace.sync_listing_search_document_lifecycle()
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
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION marketplace.sync_listing_search_document_lifecycle() FROM PUBLIC;
REVOKE ALL ON FUNCTION marketplace.sync_listing_search_document_lifecycle() FROM anon;
REVOKE ALL ON FUNCTION marketplace.sync_listing_search_document_lifecycle() FROM authenticated;
REVOKE ALL ON FUNCTION marketplace.sync_listing_search_document_lifecycle() FROM service_role;

CREATE TRIGGER listing_search_document_lifecycle_sync
AFTER INSERT OR UPDATE OF status, moderation_status
ON marketplace.listings
FOR EACH ROW
EXECUTE FUNCTION marketplace.sync_listing_search_document_lifecycle();

COMMENT ON FUNCTION marketplace.sync_listing_search_document_lifecycle() IS
  'Internal trigger-only Search projection synchronizer: publishes eligible approvals and deletes every non-public lifecycle exit.';

COMMIT;
