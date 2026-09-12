BEGIN;

DO $$
DECLARE
  listing_id UUID;
BEGIN
  FOR listing_id IN
    SELECT id
    FROM marketplace.listings
  LOOP
    PERFORM marketplace.refresh_listing_search_document(listing_id);
  END LOOP;
END;
$$;

COMMENT ON TABLE marketplace.listing_search_documents IS
  'Public-safe publication snapshot for Search; canonical listing/profile data remains authoritative. FUNCTIONAL-02C1D backfill reconciled every existing listing through the canonical eligibility predicate.';

COMMIT;
