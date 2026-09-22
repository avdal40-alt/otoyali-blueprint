BEGIN;

CREATE FUNCTION marketplace.listing_matches_search_v1(
  p_request JSONB,
  p_listing_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = marketplace, pg_catalog
AS $$
  WITH semantics AS (
    SELECT marketplace.normalize_search_listings_v1_semantics(p_request) AS value
  ), document AS (
    SELECT d
    FROM marketplace.listing_search_documents AS d
    WHERE d.listing_id = p_listing_id
  )
  SELECT COALESCE(
    (
      SELECT marketplace.search_listing_document_matches_v1(
        semantics.value,
        document.d
      )
      FROM semantics
      CROSS JOIN document
    ),
    FALSE
  );
$$;

REVOKE ALL ON FUNCTION marketplace.listing_matches_search_v1(JSONB, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.listing_matches_search_v1(JSONB, UUID)
  TO service_role;

COMMENT ON FUNCTION marketplace.listing_matches_search_v1(JSONB, UUID) IS
  'FUNCTIONAL-03B-B0-B internal Search v1 single-listing semantic matcher. It reads only the public-safe search projection and returns false when no projection row exists.';

NOTIFY pgrst, 'reload schema';

COMMIT;
