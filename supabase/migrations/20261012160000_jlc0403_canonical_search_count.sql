BEGIN;

-- JLC-0403: keep the live filter CTA on the same normalized, public-safe
-- search semantics as Search v1 without returning listing rows or metadata.
CREATE FUNCTION marketplace.count_search_listings_v1(p_request JSONB)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = marketplace, pg_catalog
AS $$
DECLARE
  v_semantics marketplace.search_listings_v1_semantics;
BEGIN
  v_semantics := marketplace.normalize_search_listings_v1_semantics(p_request);

  RETURN (
    SELECT count(*)
    FROM marketplace.listing_search_documents AS document
    WHERE marketplace.search_listing_document_matches_v1(v_semantics, document)
  );
END;
$$;

REVOKE ALL ON FUNCTION marketplace.count_search_listings_v1(JSONB) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.count_search_listings_v1(JSONB) TO anon, authenticated, service_role;
COMMENT ON FUNCTION marketplace.count_search_listings_v1(JSONB) IS
  'JLC-0403 public Search v1 count boundary. It reuses the canonical normalized matcher and returns only a count.';

NOTIFY pgrst, 'reload schema';

COMMIT;
