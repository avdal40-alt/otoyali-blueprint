BEGIN;

-- Vehicle Marketplace V2 expanded the lifecycle trigger's projection inputs,
-- but its replacement omitted the existing Buyer Request notification producer.
-- Keep the V2 fields and restore the shared saved-search/Buyer Request matcher.
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
     OR OLD.vehicle_category IS DISTINCT FROM NEW.vehicle_category
     OR OLD.listing_purpose IS DISTINCT FROM NEW.listing_purpose
     OR OLD.rental_price_per_day IS DISTINCT FROM NEW.rental_price_per_day
     OR OLD.rental_price_per_month IS DISTINCT FROM NEW.rental_price_per_month
     OR OLD.minimum_rental_days IS DISTINCT FROM NEW.minimum_rental_days
     OR OLD.security_deposit_amount IS DISTINCT FROM NEW.security_deposit_amount
     OR OLD.with_driver_or_operator IS DISTINCT FROM NEW.with_driver_or_operator
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

NOTIFY pgrst, 'reload schema';

COMMIT;
