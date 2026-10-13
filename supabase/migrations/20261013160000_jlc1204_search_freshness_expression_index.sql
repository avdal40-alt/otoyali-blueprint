BEGIN;

-- JLC-1204: Search v1 ranks newest results by the effective freshness value,
-- not by raised_at and published_at as separate sort keys.  Match that exact
-- expression so the bounded public page can be served without a full sort.
CREATE INDEX IF NOT EXISTS listing_search_documents_freshness_keyset_idx
  ON marketplace.listing_search_documents
  ((COALESCE(raised_at, published_at, 'epoch'::TIMESTAMPTZ)) DESC, listing_id ASC);

COMMENT ON INDEX marketplace.listing_search_documents_freshness_keyset_idx IS
  'JLC-1204: exact keyset order for Search v1 newest/raised ranking.';

COMMIT;
