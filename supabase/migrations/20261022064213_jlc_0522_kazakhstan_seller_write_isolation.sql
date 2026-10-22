BEGIN;

-- JLC-0522: listing market identity is derived exclusively from its city.
-- Only mutations that establish or change city/currency are constrained, so
-- historical TR records remain intact and can retain unrelated lifecycle data.
CREATE OR REPLACE FUNCTION marketplace.enforce_jolmod_kazakhstan_listing_market()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = marketplace, pg_catalog
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.city_id IS NOT DISTINCT FROM OLD.city_id
     AND NEW.currency IS NOT DISTINCT FROM OLD.currency THEN
    RETURN NEW;
  END IF;
  IF NEW.city_id IS NULL OR NOT marketplace.is_jolmod_kazakhstan_city(NEW.city_id) THEN
    RAISE EXCEPTION 'Kazakhstan listing city is required' USING ERRCODE = 'OT422';
  END IF;
  IF NEW.currency IS DISTINCT FROM 'KZT'::CHAR(3) THEN
    RAISE EXCEPTION 'Kazakhstan listing currency must be KZT' USING ERRCODE = 'OT422';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS jolmod_kazakhstan_listing_market_guard ON marketplace.listings;
CREATE TRIGGER jolmod_kazakhstan_listing_market_guard
  BEFORE INSERT OR UPDATE OF city_id, currency ON marketplace.listings
  FOR EACH ROW
  EXECUTE FUNCTION marketplace.enforce_jolmod_kazakhstan_listing_market();

REVOKE ALL ON FUNCTION marketplace.enforce_jolmod_kazakhstan_listing_market() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.enforce_jolmod_kazakhstan_listing_market() TO service_role;
COMMENT ON FUNCTION marketplace.enforce_jolmod_kazakhstan_listing_market() IS
  'JLC-0522 database market-write guard: public Jolmod listing city must be KZ and currency must be KZT.';

NOTIFY pgrst, 'reload schema';
COMMIT;
