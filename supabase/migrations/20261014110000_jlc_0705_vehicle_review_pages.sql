BEGIN;

-- Listings may be linked to a canonical generation when it is known.  It is
-- deliberately nullable: existing listings and catalog-incomplete listings
-- remain valid and simply have no review destination.
ALTER TABLE vehicle.vehicle_profiles
  ADD COLUMN generation_id UUID;

ALTER TABLE vehicle.vehicle_profiles
  ADD CONSTRAINT vehicle_profiles_generation_model_fk
  FOREIGN KEY (generation_id, model_id)
  REFERENCES vehicle.generations(id, model_id) ON DELETE RESTRICT;

CREATE INDEX vehicle_profiles_generation_id_idx
  ON vehicle.vehicle_profiles (generation_id)
  WHERE generation_id IS NOT NULL;

-- This is intentionally a minimal, public projection.  It is SECURITY DEFINER
-- because vehicle_profiles are not a public API surface; the eligibility check
-- remains in the function and no seller/account/contact columns are returned.
CREATE OR REPLACE FUNCTION public.get_public_listing_review_target(p_listing_id UUID)
RETURNS TABLE (
  make_id UUID,
  make_name TEXT,
  make_slug TEXT,
  model_id UUID,
  model_name TEXT,
  model_slug TEXT,
  generation_id UUID,
  generation_name TEXT,
  generation_slug TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = marketplace, vehicle, pg_catalog
AS $$
  SELECT ma.id, ma.name, ma.slug, mo.id, mo.name, mo.slug, ge.id, ge.name, ge.slug
  FROM marketplace.listings AS li
  JOIN vehicle.vehicle_profiles AS vp ON vp.id = li.vehicle_profile_id
  JOIN vehicle.generations AS ge ON ge.id = vp.generation_id AND ge.is_active
  JOIN vehicle.models AS mo ON mo.id = ge.model_id AND mo.is_active
  JOIN vehicle.makes AS ma ON ma.id = mo.make_id AND ma.is_active
  WHERE li.id = p_listing_id
    AND li.status = 'active'
    AND li.moderation_status = 'active'
    AND vp.profile_status = 'active';
$$;

REVOKE ALL ON FUNCTION public.get_public_listing_review_target(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_listing_review_target(UUID) TO anon, authenticated;

-- This bounded projection is used by a generation-review page.  It prevents a
-- page from scanning marketplace search cards and keeps seller identity private.
CREATE OR REPLACE FUNCTION public.get_public_generation_review_listings(
  p_generation_id UUID,
  p_limit INTEGER DEFAULT 12
)
RETURNS TABLE (listing_id UUID, title TEXT, price_amount BIGINT, currency CHAR(3), city TEXT, published_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = marketplace, vehicle, pg_catalog
AS $$
  SELECT li.id, li.title, li.price_amount, li.currency, li.city, li.published_at
  FROM vehicle.vehicle_profiles AS vp
  JOIN marketplace.listings AS li ON li.vehicle_profile_id = vp.id
  WHERE vp.generation_id = p_generation_id
    AND vp.profile_status = 'active'
    AND li.status = 'active'
    AND li.moderation_status = 'active'
  ORDER BY li.published_at DESC NULLS LAST, li.id ASC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 12), 1), 24);
$$;

REVOKE ALL ON FUNCTION public.get_public_generation_review_listings(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_generation_review_listings(UUID, INTEGER) TO anon, authenticated;

COMMENT ON COLUMN vehicle.vehicle_profiles.generation_id IS
  'Optional canonical vehicle generation. It enables review links without requiring catalog-incomplete listings to fabricate a generation.';
COMMENT ON FUNCTION public.get_public_listing_review_target(UUID) IS
  'Safe public canonical review target for one active listing; excludes seller/account/contact data.';

NOTIFY pgrst, 'reload schema';
COMMIT;
