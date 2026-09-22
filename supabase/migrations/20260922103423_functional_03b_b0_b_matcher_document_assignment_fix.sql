BEGIN;

CREATE OR REPLACE FUNCTION marketplace.listing_matches_search_v1(
  p_request JSONB,
  p_listing_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = marketplace, pg_catalog
AS $$
DECLARE
  v_semantics marketplace.search_listings_v1_semantics;
  v_document marketplace.listing_search_documents;
BEGIN
  v_semantics := marketplace.normalize_search_listings_v1_semantics(p_request);

  SELECT d.*
  INTO v_document
  FROM marketplace.listing_search_documents AS d
  WHERE d.listing_id = p_listing_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  RETURN marketplace.search_listing_document_matches_v1(
    v_semantics,
    v_document
  );
END;
$$;

REVOKE ALL ON FUNCTION marketplace.listing_matches_search_v1(JSONB, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.listing_matches_search_v1(JSONB, UUID)
  TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
