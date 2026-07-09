-- PERF-01: additive indexes for public marketplace browsing and media readiness.
-- No table/view shape changes. Keep public view column order untouched.

CREATE INDEX IF NOT EXISTS listings_active_browse_idx
  ON marketplace.listings (status, moderation_status, published_at DESC);

CREATE INDEX IF NOT EXISTS listings_city_idx
  ON marketplace.listings (city);

CREATE INDEX IF NOT EXISTS listings_price_amount_idx
  ON marketplace.listings (price_amount);

CREATE INDEX IF NOT EXISTS listings_currency_idx
  ON marketplace.listings (currency);

CREATE INDEX IF NOT EXISTS listings_cover_media_id_idx
  ON marketplace.listings (cover_media_id);

CREATE INDEX IF NOT EXISTS vehicle_profiles_profile_status_idx
  ON vehicle.vehicle_profiles (profile_status);

CREATE INDEX IF NOT EXISTS vehicle_profiles_model_id_idx
  ON vehicle.vehicle_profiles (model_id);

CREATE INDEX IF NOT EXISTS vehicle_profiles_year_idx
  ON vehicle.vehicle_profiles (year);

CREATE INDEX IF NOT EXISTS vehicle_profiles_mileage_km_idx
  ON vehicle.vehicle_profiles (mileage_km);

CREATE INDEX IF NOT EXISTS vehicle_profiles_fuel_type_idx
  ON vehicle.vehicle_profiles (fuel_type);

CREATE INDEX IF NOT EXISTS vehicle_profiles_transmission_idx
  ON vehicle.vehicle_profiles (transmission);

CREATE INDEX IF NOT EXISTS vehicle_profiles_color_idx
  ON vehicle.vehicle_profiles (color);

CREATE INDEX IF NOT EXISTS profile_media_cover_order_idx
  ON vehicle.profile_media (vehicle_profile_id, is_cover, sort_order, created_at);

CREATE INDEX IF NOT EXISTS listing_videos_processing_status_idx
  ON marketplace.listing_videos (processing_status);

CREATE INDEX IF NOT EXISTS listing_videos_moderation_status_idx
  ON marketplace.listing_videos (moderation_status);

CREATE INDEX IF NOT EXISTS cities_slug_idx
  ON marketplace.cities (slug);

CREATE INDEX IF NOT EXISTS cities_active_sort_idx
  ON marketplace.cities (is_active, sort_order, name);

CREATE INDEX IF NOT EXISTS makes_active_name_idx
  ON vehicle.makes (is_active, name);

CREATE INDEX IF NOT EXISTS models_make_active_name_idx
  ON vehicle.models (make_id, is_active, name);

CREATE INDEX IF NOT EXISTS models_slug_idx
  ON vehicle.models (slug);
