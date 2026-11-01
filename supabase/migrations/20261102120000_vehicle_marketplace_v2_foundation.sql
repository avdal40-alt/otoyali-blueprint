BEGIN;

-- Vehicle Marketplace V2 is an additive extension of the existing listing
-- identity. Historical listings retain the passenger-car sale defaults.
CREATE TYPE marketplace.vehicle_category AS ENUM (
  'passenger_car', 'truck', 'bus', 'trailer', 'special_machinery'
);

CREATE TYPE marketplace.listing_purpose AS ENUM ('sale', 'rent');

ALTER TABLE marketplace.listings
  ADD COLUMN vehicle_category marketplace.vehicle_category NOT NULL DEFAULT 'passenger_car',
  ADD COLUMN listing_purpose marketplace.listing_purpose NOT NULL DEFAULT 'sale',
  ADD COLUMN rental_price_per_day BIGINT,
  ADD COLUMN rental_price_per_month BIGINT,
  ADD COLUMN minimum_rental_days INTEGER,
  ADD COLUMN security_deposit_amount BIGINT,
  ADD COLUMN with_driver_or_operator BOOLEAN,
  ALTER COLUMN price_amount DROP NOT NULL;

ALTER TABLE marketplace.listings
  ADD CONSTRAINT listings_v2_price_contract_chk CHECK (
    (listing_purpose = 'sale'
      AND price_amount IS NOT NULL AND price_amount > 0
      AND rental_price_per_day IS NULL AND rental_price_per_month IS NULL
      AND minimum_rental_days IS NULL AND security_deposit_amount IS NULL
      AND with_driver_or_operator IS NULL)
    OR
    (listing_purpose = 'rent'
      AND price_amount IS NULL
      AND currency = 'KZT'
      AND rental_price_per_day IS NOT NULL AND rental_price_per_day > 0
      AND (rental_price_per_month IS NULL OR rental_price_per_month > 0)
      AND (minimum_rental_days IS NULL OR minimum_rental_days > 0)
      AND (security_deposit_amount IS NULL OR security_deposit_amount >= 0))
  ) NOT VALID;

ALTER TABLE marketplace.listings
  VALIDATE CONSTRAINT listings_v2_price_contract_chk;

COMMENT ON COLUMN marketplace.listings.listing_purpose IS
  'V2 listing intent. Rent remains classified lead generation; Jolmod never processes booking, payment, escrow, or deposits.';
COMMENT ON COLUMN marketplace.listings.security_deposit_amount IS
  'Seller-provided informational rental term only. Jolmod does not collect, hold, or guarantee any deposit.';

CREATE INDEX listings_v2_category_purpose_city_idx
  ON marketplace.listings (vehicle_category, listing_purpose, city_id)
  WHERE archived_at IS NULL;
CREATE INDEX listings_v2_rental_daily_price_idx
  ON marketplace.listings (rental_price_per_day, id)
  WHERE listing_purpose = 'rent' AND archived_at IS NULL;

-- Category-specific attributes remain separate from shared listing/lifecycle
-- state. Direct access is intentionally denied; future owner RPCs provide the
-- only write boundary.
CREATE TABLE marketplace.listing_vehicle_category_details (
  listing_id UUID PRIMARY KEY REFERENCES marketplace.listings(id) ON DELETE CASCADE,
  truck_body_type TEXT,
  bus_type TEXT,
  trailer_type TEXT,
  machinery_type TEXT,
  payload_capacity_kg INTEGER,
  gross_weight_kg INTEGER,
  axle_count SMALLINT,
  seat_count SMALLINT,
  operating_hours INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT listing_vehicle_category_details_truck_body_type_chk CHECK (truck_body_type IS NULL OR char_length(btrim(truck_body_type)) BETWEEN 1 AND 80),
  CONSTRAINT listing_vehicle_category_details_bus_type_chk CHECK (bus_type IS NULL OR bus_type IN ('minibus', 'city', 'intercity', 'tourist', 'other')),
  CONSTRAINT listing_vehicle_category_details_trailer_type_chk CHECK (trailer_type IS NULL OR char_length(btrim(trailer_type)) BETWEEN 1 AND 80),
  CONSTRAINT listing_vehicle_category_details_machinery_type_chk CHECK (machinery_type IS NULL OR char_length(btrim(machinery_type)) BETWEEN 1 AND 80),
  CONSTRAINT listing_vehicle_category_details_payload_chk CHECK (payload_capacity_kg IS NULL OR payload_capacity_kg > 0),
  CONSTRAINT listing_vehicle_category_details_gross_weight_chk CHECK (gross_weight_kg IS NULL OR gross_weight_kg > 0),
  CONSTRAINT listing_vehicle_category_details_axle_chk CHECK (axle_count IS NULL OR axle_count BETWEEN 1 AND 16),
  CONSTRAINT listing_vehicle_category_details_seat_chk CHECK (seat_count IS NULL OR seat_count BETWEEN 1 AND 200),
  CONSTRAINT listing_vehicle_category_details_hours_chk CHECK (operating_hours IS NULL OR operating_hours >= 0)
);

CREATE TRIGGER listing_vehicle_category_details_set_updated_at
  BEFORE UPDATE ON marketplace.listing_vehicle_category_details
  FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();

ALTER TABLE marketplace.listing_vehicle_category_details ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE marketplace.listing_vehicle_category_details FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE marketplace.listing_vehicle_category_details TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
