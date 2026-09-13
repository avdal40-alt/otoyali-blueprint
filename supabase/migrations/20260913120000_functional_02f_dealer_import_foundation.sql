BEGIN;

-- FUNCTIONAL-02F establishes private, service-operated import bookkeeping.
-- It deliberately stores neither spreadsheet bytes nor an unbounded raw row
-- payload: source parsing and listing mutation remain a later service boundary.

CREATE TYPE marketplace.dealer_import_source AS ENUM ('excel');
CREATE TYPE marketplace.dealer_import_status AS ENUM ('received', 'validating', 'validated', 'applying', 'completed', 'failed');
CREATE TYPE marketplace.dealer_import_row_status AS ENUM ('pending', 'valid', 'invalid', 'applied', 'archived');
CREATE TYPE marketplace.dealer_import_operation AS ENUM ('upsert', 'archive');

CREATE TABLE marketplace.dealer_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  source marketplace.dealer_import_source NOT NULL DEFAULT 'excel',
  status marketplace.dealer_import_status NOT NULL DEFAULT 'received',
  source_sha256 CHAR(64) NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT dealer_import_batches_sha256_chk CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT dealer_import_batches_completed_at_chk CHECK (
    (status IN ('completed', 'failed') AND completed_at IS NOT NULL)
    OR (status NOT IN ('completed', 'failed') AND completed_at IS NULL)
  )
);

COMMENT ON TABLE marketplace.dealer_import_batches IS
  'Private service-operated dealer import batches. Raw spreadsheet content is intentionally not retained here.';

CREATE INDEX dealer_import_batches_dealer_received_idx
  ON marketplace.dealer_import_batches (dealer_id, received_at DESC);

CREATE TRIGGER dealer_import_batches_set_updated_at
  BEFORE UPDATE ON marketplace.dealer_import_batches
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

CREATE OR REPLACE FUNCTION marketplace.validate_dealer_import_batch_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles AS dealer
    WHERE dealer.id = NEW.dealer_id AND dealer.seller_type = 'dealer'
  ) THEN
    RAISE EXCEPTION 'dealer import requires dealer seller type' USING ERRCODE = 'OT403';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER dealer_import_batches_validate_owner
  BEFORE INSERT OR UPDATE OF dealer_id ON marketplace.dealer_import_batches
  FOR EACH ROW EXECUTE FUNCTION marketplace.validate_dealer_import_batch_owner();

CREATE TABLE marketplace.dealer_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES marketplace.dealer_import_batches(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  operation marketplace.dealer_import_operation NOT NULL DEFAULT 'upsert',
  external_listing_id TEXT,
  status marketplace.dealer_import_row_status NOT NULL DEFAULT 'pending',
  listing_id UUID REFERENCES marketplace.listings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT dealer_import_rows_number_chk CHECK (row_number > 0),
  CONSTRAINT dealer_import_rows_external_id_chk CHECK (
    external_listing_id IS NULL OR char_length(btrim(external_listing_id)) BETWEEN 1 AND 128
  ),
  CONSTRAINT dealer_import_rows_batch_number_unique UNIQUE (batch_id, row_number)
);

COMMENT ON TABLE marketplace.dealer_import_rows IS
  'Private normalized row outcomes only; no raw spreadsheet values are stored.';

CREATE INDEX dealer_import_rows_batch_status_idx
  ON marketplace.dealer_import_rows (batch_id, status, row_number);

CREATE TRIGGER dealer_import_rows_set_updated_at
  BEFORE UPDATE ON marketplace.dealer_import_rows
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

CREATE OR REPLACE FUNCTION marketplace.validate_dealer_import_row_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = marketplace, pg_catalog
AS $$
BEGIN
  IF NEW.external_listing_id IS NOT NULL THEN
    NEW.external_listing_id := btrim(NEW.external_listing_id);
  END IF;

  IF NEW.listing_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM marketplace.dealer_import_batches AS batch
    JOIN marketplace.listings AS listing ON listing.id = NEW.listing_id
    WHERE batch.id = NEW.batch_id AND listing.seller_id = batch.dealer_id
  ) THEN
    RAISE EXCEPTION 'dealer import row listing ownership mismatch' USING ERRCODE = 'OT403';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER dealer_import_rows_validate_owner
  BEFORE INSERT OR UPDATE OF batch_id, listing_id ON marketplace.dealer_import_rows
  FOR EACH ROW EXECUTE FUNCTION marketplace.validate_dealer_import_row_owner();

CREATE TABLE marketplace.dealer_import_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_row_id UUID NOT NULL REFERENCES marketplace.dealer_import_rows(id) ON DELETE CASCADE,
  field_key TEXT,
  error_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT dealer_import_issues_field_key_chk CHECK (
    field_key IS NULL OR field_key ~ '^[a-z][a-z0-9_]{0,63}$'
  ),
  CONSTRAINT dealer_import_issues_error_code_chk CHECK (error_code ~ '^[a-z][a-z0-9_]{0,63}$'),
  CONSTRAINT dealer_import_issues_unique UNIQUE NULLS NOT DISTINCT (import_row_id, field_key, error_code)
);

COMMENT ON TABLE marketplace.dealer_import_issues IS
  'Machine-readable validation report entries. Messages and rejected source values are not persisted.';

CREATE TABLE marketplace.dealer_listing_external_ids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  source marketplace.dealer_import_source NOT NULL DEFAULT 'excel',
  external_listing_id TEXT NOT NULL,
  listing_id UUID NOT NULL REFERENCES marketplace.listings(id) ON DELETE RESTRICT,
  last_seen_batch_id UUID REFERENCES marketplace.dealer_import_batches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT dealer_listing_external_ids_value_chk CHECK (char_length(btrim(external_listing_id)) BETWEEN 1 AND 128),
  CONSTRAINT dealer_listing_external_ids_dealer_source_value_unique UNIQUE (dealer_id, source, external_listing_id)
);

COMMENT ON TABLE marketplace.dealer_listing_external_ids IS
  'Dealer-scoped stable external listing identity used for idempotent create/update/archive synchronization.';

CREATE INDEX dealer_listing_external_ids_listing_idx
  ON marketplace.dealer_listing_external_ids (listing_id);

CREATE TRIGGER dealer_listing_external_ids_set_updated_at
  BEFORE UPDATE ON marketplace.dealer_listing_external_ids
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

CREATE OR REPLACE FUNCTION marketplace.validate_dealer_listing_external_id_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = marketplace, public, pg_catalog
AS $$
BEGIN
  NEW.external_listing_id := btrim(NEW.external_listing_id);

  IF NOT EXISTS (
    SELECT 1
    FROM marketplace.listings AS listing
    JOIN public.profiles AS dealer ON dealer.id = listing.seller_id
    WHERE listing.id = NEW.listing_id
      AND listing.seller_id = NEW.dealer_id
      AND dealer.seller_type = 'dealer'
      AND listing.seller_type = 'dealer'
  ) THEN
    RAISE EXCEPTION 'dealer import listing ownership mismatch' USING ERRCODE = 'OT403';
  END IF;

  IF NEW.last_seen_batch_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM marketplace.dealer_import_batches AS batch
    WHERE batch.id = NEW.last_seen_batch_id AND batch.dealer_id = NEW.dealer_id
  ) THEN
    RAISE EXCEPTION 'dealer import batch ownership mismatch' USING ERRCODE = 'OT403';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER dealer_listing_external_ids_validate_owner
  BEFORE INSERT OR UPDATE OF dealer_id, source, external_listing_id, listing_id, last_seen_batch_id
  ON marketplace.dealer_listing_external_ids
  FOR EACH ROW EXECUTE FUNCTION marketplace.validate_dealer_listing_external_id_owner();

REVOKE ALL ON FUNCTION marketplace.validate_dealer_import_batch_owner() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.validate_dealer_import_row_owner() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION marketplace.validate_dealer_listing_external_id_owner() FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE marketplace.dealer_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.dealer_import_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.dealer_import_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.dealer_listing_external_ids ENABLE ROW LEVEL SECURITY;

CREATE POLICY dealer_import_batches_select_own
  ON marketplace.dealer_import_batches FOR SELECT TO authenticated
  USING (dealer_id = auth.uid());

CREATE POLICY dealer_import_rows_select_own
  ON marketplace.dealer_import_rows FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM marketplace.dealer_import_batches AS batch
    WHERE batch.id = dealer_import_rows.batch_id AND batch.dealer_id = auth.uid()
  ));

CREATE POLICY dealer_import_issues_select_own
  ON marketplace.dealer_import_issues FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM marketplace.dealer_import_rows AS row
    JOIN marketplace.dealer_import_batches AS batch ON batch.id = row.batch_id
    WHERE row.id = dealer_import_issues.import_row_id AND batch.dealer_id = auth.uid()
  ));

CREATE POLICY dealer_listing_external_ids_select_own
  ON marketplace.dealer_listing_external_ids FOR SELECT TO authenticated
  USING (dealer_id = auth.uid());

REVOKE ALL ON TABLE marketplace.dealer_import_batches, marketplace.dealer_import_rows,
  marketplace.dealer_import_issues, marketplace.dealer_listing_external_ids FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE marketplace.dealer_import_batches, marketplace.dealer_import_rows,
  marketplace.dealer_import_issues, marketplace.dealer_listing_external_ids TO authenticated;
GRANT ALL ON TABLE marketplace.dealer_import_batches, marketplace.dealer_import_rows,
  marketplace.dealer_import_issues, marketplace.dealer_listing_external_ids TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
