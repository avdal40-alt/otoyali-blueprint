BEGIN;
CREATE TABLE marketplace.listing_search_documents (
  listing_id UUID PRIMARY KEY REFERENCES marketplace.listings(id) ON DELETE CASCADE,
  make_id UUID, model_id UUID, variant_id UUID,
  make_name TEXT, model_name TEXT, variant_name TEXT,
  condition TEXT, year SMALLINT, mileage_km INTEGER, fuel_type TEXT, transmission TEXT,
  body_type TEXT, drive_type TEXT, color TEXT, engine_volume_l NUMERIC(4,1), power_kw SMALLINT,
  battery_capacity_kwh NUMERIC(6,1), electric_range_km SMALLINT,
  seller_service_declaration TEXT, seller_damage_declaration TEXT,
  price_amount BIGINT NOT NULL, currency CHAR(3) NOT NULL, price_negotiable BOOLEAN NOT NULL,
  trade_in_accepted BOOLEAN NOT NULL, city_id UUID, district_id UUID, city_name TEXT, district_name TEXT,
  seller_type TEXT, cover_image_url TEXT, photo_count INTEGER NOT NULL DEFAULT 0, has_video BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ, projected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT listing_search_documents_photo_count_chk CHECK (photo_count >= 0)
);
COMMENT ON TABLE marketplace.listing_search_documents IS 'Public-safe publication snapshot for Search; canonical listing/profile data remains authoritative.';
CREATE INDEX listing_search_documents_newest_idx ON marketplace.listing_search_documents (published_at DESC, listing_id);
CREATE INDEX listing_search_documents_price_idx ON marketplace.listing_search_documents (price_amount, listing_id);
CREATE INDEX listing_search_documents_vehicle_idx ON marketplace.listing_search_documents (make_id, model_id, variant_id);
CREATE INDEX listing_search_documents_location_idx ON marketplace.listing_search_documents (city_id, district_id);
ALTER TABLE marketplace.listing_search_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY listing_search_documents_select_public ON marketplace.listing_search_documents FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY listing_search_documents_service_role_all ON marketplace.listing_search_documents FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
GRANT SELECT ON marketplace.listing_search_documents TO anon, authenticated;
GRANT ALL ON marketplace.listing_search_documents TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
