BEGIN;

-- FUNCTIONAL-02B1: additive, non-public vehicle and listing foundations.
-- The values remain seller-entered product data; provenance and trust semantics
-- are deliberately deferred to FUNCTIONAL-02B2.

CREATE TYPE vehicle.hybrid_type AS ENUM (
  'mild_hybrid',
  'full_hybrid',
  'plug_in_hybrid',
  'range_extender'
);

CREATE TABLE vehicle.variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES vehicle.models(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT vehicle_variants_name_not_empty_chk CHECK (char_length(trim(name)) > 0),
  CONSTRAINT vehicle_variants_slug_format_chk CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT vehicle_variants_model_slug_unique UNIQUE (model_id, slug),
  CONSTRAINT vehicle_variants_id_model_unique UNIQUE (id, model_id)
);

COMMENT ON TABLE vehicle.variants IS
  'Canonical model-scoped variant catalog. Catalog rows do not assert seller vehicle facts.';

CREATE INDEX vehicle_variants_model_active_name_idx
  ON vehicle.variants (model_id, is_active, name);

CREATE TABLE marketplace.districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES marketplace.cities(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  sort_order INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT marketplace_districts_name_not_empty_chk CHECK (char_length(trim(name)) > 0),
  CONSTRAINT marketplace_districts_slug_format_chk CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT marketplace_districts_sort_order_chk CHECK (sort_order IS NULL OR sort_order >= 0),
  CONSTRAINT marketplace_districts_city_slug_unique UNIQUE (city_id, slug),
  CONSTRAINT marketplace_districts_id_city_unique UNIQUE (id, city_id)
);

COMMENT ON TABLE marketplace.districts IS
  'Turkey İlçe catalog attached to the existing marketplace.cities province catalog.';

CREATE INDEX marketplace_districts_city_active_name_idx
  ON marketplace.districts (city_id, is_active, name);

ALTER TABLE vehicle.vehicle_profiles
  ADD COLUMN variant_id UUID,
  ADD COLUMN power_kw SMALLINT,
  ADD COLUMN door_count SMALLINT,
  ADD COLUMN seat_count SMALLINT,
  ADD COLUMN battery_capacity_kwh NUMERIC(6, 1),
  ADD COLUMN electric_range_km SMALLINT,
  ADD COLUMN hybrid_type vehicle.hybrid_type;

ALTER TABLE vehicle.vehicle_profiles
  ADD CONSTRAINT vehicle_profiles_variant_model_fk
    FOREIGN KEY (variant_id, model_id)
    REFERENCES vehicle.variants (id, model_id)
    ON DELETE RESTRICT NOT VALID,
  ADD CONSTRAINT vehicle_profiles_power_kw_chk
    CHECK (power_kw IS NULL OR power_kw BETWEEN 1 AND 2000) NOT VALID,
  ADD CONSTRAINT vehicle_profiles_door_count_chk
    CHECK (door_count IS NULL OR door_count BETWEEN 1 AND 12) NOT VALID,
  ADD CONSTRAINT vehicle_profiles_seat_count_chk
    CHECK (seat_count IS NULL OR seat_count BETWEEN 1 AND 100) NOT VALID,
  ADD CONSTRAINT vehicle_profiles_battery_capacity_kwh_chk
    CHECK (battery_capacity_kwh IS NULL OR battery_capacity_kwh > 0) NOT VALID,
  ADD CONSTRAINT vehicle_profiles_electric_range_km_chk
    CHECK (electric_range_km IS NULL OR electric_range_km BETWEEN 1 AND 3000) NOT VALID;

COMMENT ON COLUMN vehicle.vehicle_profiles.variant_id IS
  'Optional canonical catalog variant constrained to the selected model.';
COMMENT ON COLUMN vehicle.vehicle_profiles.power_kw IS
  'Canonical seller-entered vehicle power in kilowatts; display conversions are derived, never independently stored.';
COMMENT ON COLUMN vehicle.vehicle_profiles.battery_capacity_kwh IS
  'Optional seller-entered usable or nominal battery capacity; its measurement basis is not inferred.';
COMMENT ON COLUMN vehicle.vehicle_profiles.electric_range_km IS
  'Optional seller-entered electric range; standard, test cycle, and verification are intentionally not inferred.';
COMMENT ON COLUMN vehicle.vehicle_profiles.hybrid_type IS
  'Optional hybrid architecture classification. It may coexist with battery/range values for plug-in vehicles.';

ALTER TABLE marketplace.listings
  ADD COLUMN city_id UUID,
  ADD COLUMN district_id UUID,
  ADD COLUMN trade_in_accepted BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE marketplace.listings
  ADD CONSTRAINT listings_city_fk
    FOREIGN KEY (city_id)
    REFERENCES marketplace.cities (id)
    ON DELETE RESTRICT NOT VALID,
  ADD CONSTRAINT listings_district_city_fk
    FOREIGN KEY (district_id, city_id)
    REFERENCES marketplace.districts (id, city_id)
    ON DELETE RESTRICT NOT VALID,
  ADD CONSTRAINT listings_district_requires_city_chk
    CHECK (district_id IS NULL OR city_id IS NOT NULL) NOT VALID;

COMMENT ON COLUMN marketplace.listings.district_id IS
  'Optional Turkey İlçe reference constrained to city_id. Existing city text remains the backward-compatible location field.';
COMMENT ON COLUMN marketplace.listings.city_id IS
  'Optional canonical Turkey İl reference. Existing city text remains readable for backward compatibility.';
COMMENT ON COLUMN marketplace.listings.trade_in_accepted IS
  'Seller-declared Takas availability; it does not create a payment or escrow flow.';

ALTER TABLE vehicle.variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.districts ENABLE ROW LEVEL SECURITY;

CREATE POLICY vehicle_variants_select_active
  ON vehicle.variants
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1
      FROM vehicle.models AS model
      INNER JOIN vehicle.makes AS make ON make.id = model.make_id
      WHERE model.id = variants.model_id
        AND model.is_active = TRUE
        AND make.is_active = TRUE
    )
  );

CREATE POLICY vehicle_variants_service_role_all
  ON vehicle.variants
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY marketplace_districts_select_active
  ON marketplace.districts
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1
      FROM marketplace.cities AS city
      WHERE city.id = districts.city_id
        AND city.is_active = TRUE
    )
  );

CREATE POLICY marketplace_districts_service_role_all
  ON marketplace.districts
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

GRANT SELECT ON vehicle.variants TO anon, authenticated;
GRANT SELECT ON marketplace.districts TO anon, authenticated;
GRANT ALL ON vehicle.variants TO service_role;
GRANT ALL ON marketplace.districts TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
