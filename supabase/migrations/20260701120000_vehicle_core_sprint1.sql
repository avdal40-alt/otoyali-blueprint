-- =============================================================================
-- OTOYALI - Vehicle Core MVP (Sprint 1)
-- Migration: 20260701120000_vehicle_core_sprint1.sql
-- Scope: minimal vehicle catalog, vehicle profiles, media, ownership, listings
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Schemas
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS vehicle;
CREATE SCHEMA IF NOT EXISTS marketplace;

COMMENT ON SCHEMA vehicle IS
  'Vehicle domain for Sprint 1: catalog, permanent vehicle profiles, ownership, and media.';

COMMENT ON SCHEMA marketplace IS
  'Marketplace domain for Sprint 1: temporary listing overlays on vehicle profiles.';

GRANT USAGE ON SCHEMA vehicle TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA marketplace TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE vehicle.fuel_type AS ENUM (
  'gasoline',
  'diesel',
  'lpg',
  'electric',
  'hybrid'
);

CREATE TYPE vehicle.transmission_type AS ENUM (
  'manual',
  'automatic'
);

CREATE TYPE vehicle.created_source AS ENUM (
  'manual',
  'ai',
  'vin'
);

CREATE TYPE vehicle.profile_status AS ENUM (
  'active',
  'archived'
);

CREATE TYPE vehicle.ownership_type AS ENUM (
  'owner'
);

CREATE TYPE marketplace.listing_status AS ENUM (
  'draft',
  'active',
  'paused',
  'sold',
  'removed'
);

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------

CREATE TABLE vehicle.makes (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT makes_name_not_empty_chk
    CHECK (char_length(trim(name)) > 0),

  CONSTRAINT makes_slug_format_chk
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

COMMENT ON TABLE vehicle.makes IS
  'Minimal vehicle make catalog for Sprint 1 listing creation and browse filters.';

CREATE UNIQUE INDEX makes_slug_unique_idx
  ON vehicle.makes (slug);

CREATE TABLE vehicle.models (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  make_id    UUID        NOT NULL REFERENCES vehicle.makes(id) ON DELETE RESTRICT,
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT models_name_not_empty_chk
    CHECK (char_length(trim(name)) > 0),

  CONSTRAINT models_slug_format_chk
    CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),

  CONSTRAINT models_make_slug_unique UNIQUE (make_id, slug)
);

COMMENT ON TABLE vehicle.models IS
  'Minimal vehicle model catalog scoped to a make.';

CREATE INDEX models_make_id_idx
  ON vehicle.models (make_id);

-- ---------------------------------------------------------------------------
-- Vehicle profile: permanent vehicle identity for Sprint 1
-- ---------------------------------------------------------------------------

CREATE TABLE vehicle.vehicle_profiles (
  id              UUID                      PRIMARY KEY DEFAULT gen_random_uuid(),
  make_id         UUID                      NOT NULL REFERENCES vehicle.makes(id) ON DELETE RESTRICT,
  model_id        UUID                      NOT NULL REFERENCES vehicle.models(id) ON DELETE RESTRICT,
  year            SMALLINT                  NOT NULL,
  mileage_km      INTEGER                   NOT NULL,
  fuel_type       vehicle.fuel_type         NOT NULL,
  transmission    vehicle.transmission_type NOT NULL,
  body_type       TEXT,
  created_source  vehicle.created_source    NOT NULL DEFAULT 'manual',
  profile_status  vehicle.profile_status    NOT NULL DEFAULT 'active',
  created_by      UUID                      NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ               NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ               NOT NULL DEFAULT NOW(),

  CONSTRAINT vehicle_profiles_year_chk
    CHECK (year BETWEEN 1900 AND EXTRACT(YEAR FROM NOW())::INT + 1),

  CONSTRAINT vehicle_profiles_mileage_chk
    CHECK (mileage_km >= 0),

  CONSTRAINT vehicle_profiles_body_type_not_empty_chk
    CHECK (body_type IS NULL OR char_length(trim(body_type)) > 0)
);

COMMENT ON TABLE vehicle.vehicle_profiles IS
  'Permanent vehicle profile. Listings reference this row; specs do not live on listings.';

COMMENT ON COLUMN vehicle.vehicle_profiles.created_source IS
  'How the profile was first created. Sprint 1 defaults to manual; ai and vin are reserved source labels.';

CREATE INDEX vehicle_profiles_created_by_idx
  ON vehicle.vehicle_profiles (created_by);

CREATE INDEX vehicle_profiles_make_model_idx
  ON vehicle.vehicle_profiles (make_id, model_id);

CREATE TRIGGER vehicle_profiles_set_updated_at
  BEFORE UPDATE ON vehicle.vehicle_profiles
  FOR EACH ROW
  EXECUTE FUNCTION identity.set_updated_at();

CREATE OR REPLACE FUNCTION vehicle.validate_profile_model_make()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM vehicle.models m
    WHERE m.id = NEW.model_id
      AND m.make_id = NEW.make_id
      AND m.is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'vehicle model does not belong to selected make';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER vehicle_profiles_validate_model_make
  BEFORE INSERT OR UPDATE OF make_id, model_id ON vehicle.vehicle_profiles
  FOR EACH ROW
  EXECUTE FUNCTION vehicle.validate_profile_model_make();

-- ---------------------------------------------------------------------------
-- Ownership
-- ---------------------------------------------------------------------------

CREATE TABLE vehicle.profile_ownership (
  id                 UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_profile_id UUID                   NOT NULL REFERENCES vehicle.vehicle_profiles(id) ON DELETE CASCADE,
  owner_id           UUID                   NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ownership_type     vehicle.ownership_type NOT NULL DEFAULT 'owner',
  is_current         BOOLEAN                NOT NULL DEFAULT TRUE,
  started_at         TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
  ended_at           TIMESTAMPTZ,
  created_at         TIMESTAMPTZ            NOT NULL DEFAULT NOW(),

  CONSTRAINT profile_ownership_dates_chk
    CHECK (ended_at IS NULL OR ended_at >= started_at)
);

COMMENT ON TABLE vehicle.profile_ownership IS
  'Ownership rows for vehicle profiles. Sprint 1 uses one current owner per profile.';

CREATE UNIQUE INDEX profile_ownership_one_current_owner_idx
  ON vehicle.profile_ownership (vehicle_profile_id)
  WHERE is_current = TRUE;

CREATE INDEX profile_ownership_owner_id_idx
  ON vehicle.profile_ownership (owner_id);

CREATE INDEX profile_ownership_profile_owner_idx
  ON vehicle.profile_ownership (vehicle_profile_id, owner_id);

-- ---------------------------------------------------------------------------
-- Profile media
-- ---------------------------------------------------------------------------

CREATE TABLE vehicle.profile_media (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_profile_id UUID        NOT NULL REFERENCES vehicle.vehicle_profiles(id) ON DELETE CASCADE,
  storage_path       TEXT        NOT NULL,
  url                TEXT        NOT NULL,
  sort_order         SMALLINT    NOT NULL DEFAULT 0,
  is_cover           BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT profile_media_storage_path_not_empty_chk
    CHECK (char_length(trim(storage_path)) > 0),

  CONSTRAINT profile_media_url_not_empty_chk
    CHECK (char_length(trim(url)) > 0),

  CONSTRAINT profile_media_sort_order_chk
    CHECK (sort_order >= 0)
);

COMMENT ON TABLE vehicle.profile_media IS
  'Vehicle photos belong to the permanent vehicle profile, not to a listing.';

CREATE INDEX profile_media_vehicle_profile_id_idx
  ON vehicle.profile_media (vehicle_profile_id);

CREATE UNIQUE INDEX profile_media_one_cover_idx
  ON vehicle.profile_media (vehicle_profile_id)
  WHERE is_cover = TRUE;

CREATE INDEX profile_media_order_idx
  ON vehicle.profile_media (vehicle_profile_id, sort_order);

-- ---------------------------------------------------------------------------
-- Listings: temporary sale overlay
-- ---------------------------------------------------------------------------

CREATE TABLE marketplace.listings (
  id                 UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_profile_id UUID                       NOT NULL REFERENCES vehicle.vehicle_profiles(id) ON DELETE RESTRICT,
  seller_id          UUID                       NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status             marketplace.listing_status NOT NULL DEFAULT 'draft',
  title              TEXT                       NOT NULL,
  description        TEXT,
  price_amount       BIGINT                     NOT NULL,
  currency           CHAR(3)                    NOT NULL DEFAULT 'TRY',
  price_negotiable   BOOLEAN                    NOT NULL DEFAULT TRUE,
  city               TEXT                       NOT NULL,
  published_at       TIMESTAMPTZ,
  created_at         TIMESTAMPTZ                NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ                NOT NULL DEFAULT NOW(),

  CONSTRAINT listings_title_not_empty_chk
    CHECK (char_length(trim(title)) > 0),

  CONSTRAINT listings_price_amount_chk
    CHECK (price_amount > 0),

  CONSTRAINT listings_currency_format_chk
    CHECK (currency ~ '^[A-Z]{3}$'),

  CONSTRAINT listings_city_not_empty_chk
    CHECK (char_length(trim(city)) > 0)
);

COMMENT ON TABLE marketplace.listings IS
  'Temporary marketplace listing. Vehicle specs are read from vehicle.vehicle_profiles.';

COMMENT ON COLUMN marketplace.listings.currency IS
  'ISO 4217 currency code. Defaults to TRY for Sprint 1; not restricted to TRY for future country rollout.';

CREATE INDEX listings_status_published_at_idx
  ON marketplace.listings (status, published_at DESC);

CREATE INDEX listings_seller_id_idx
  ON marketplace.listings (seller_id);

CREATE INDEX listings_vehicle_profile_id_idx
  ON marketplace.listings (vehicle_profile_id);

CREATE TRIGGER listings_set_updated_at
  BEFORE UPDATE ON marketplace.listings
  FOR EACH ROW
  EXECUTE FUNCTION identity.set_updated_at();

CREATE OR REPLACE FUNCTION marketplace.set_listing_published_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> 'active' THEN
    NEW.published_at = NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'active' THEN
    NEW.published_at = COALESCE(NEW.published_at, NOW());
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER listings_set_published_at
  BEFORE INSERT OR UPDATE OF status ON marketplace.listings
  FOR EACH ROW
  EXECUTE FUNCTION marketplace.set_listing_published_at();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION vehicle.is_current_profile_owner(
  p_vehicle_profile_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = vehicle, public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM vehicle.profile_ownership po
    WHERE po.vehicle_profile_id = p_vehicle_profile_id
      AND po.owner_id = p_user_id
      AND po.is_current = TRUE
      AND po.ended_at IS NULL
  );
$$;

COMMENT ON FUNCTION vehicle.is_current_profile_owner(UUID, UUID) IS
  'RLS helper: true when the user is the current owner of the vehicle profile.';

CREATE OR REPLACE FUNCTION vehicle.has_active_listing(p_vehicle_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = vehicle, marketplace
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM marketplace.listings l
    WHERE l.vehicle_profile_id = p_vehicle_profile_id
      AND l.status = 'active'
  );
$$;

COMMENT ON FUNCTION vehicle.has_active_listing(UUID) IS
  'RLS helper: true when a vehicle profile is attached to at least one active listing.';

CREATE OR REPLACE FUNCTION marketplace.validate_listing_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT vehicle.is_current_profile_owner(NEW.vehicle_profile_id, NEW.seller_id) THEN
    RAISE EXCEPTION 'seller must be the current owner of the vehicle profile';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER listings_validate_owner
  BEFORE INSERT OR UPDATE OF vehicle_profile_id, seller_id ON marketplace.listings
  FOR EACH ROW
  EXECUTE FUNCTION marketplace.validate_listing_owner();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE vehicle.makes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle.vehicle_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle.profile_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle.profile_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY makes_select_active
  ON vehicle.makes
  FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE);

CREATE POLICY makes_service_role_all
  ON vehicle.makes
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY models_select_active
  ON vehicle.models
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = TRUE
    AND EXISTS (
      SELECT 1
      FROM vehicle.makes ma
      WHERE ma.id = models.make_id
        AND ma.is_active = TRUE
    )
  );

CREATE POLICY models_service_role_all
  ON vehicle.models
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY vehicle_profiles_select_public_active_listing
  ON vehicle.vehicle_profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    profile_status = 'active'
    AND vehicle.has_active_listing(id)
  );

CREATE POLICY vehicle_profiles_select_owner
  ON vehicle.vehicle_profiles
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid() OR vehicle.is_current_profile_owner(id));

CREATE POLICY vehicle_profiles_insert_own
  ON vehicle.vehicle_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY vehicle_profiles_update_owner
  ON vehicle.vehicle_profiles
  FOR UPDATE
  TO authenticated
  USING (vehicle.is_current_profile_owner(id))
  WITH CHECK (vehicle.is_current_profile_owner(id));

CREATE POLICY vehicle_profiles_service_role_all
  ON vehicle.vehicle_profiles
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY profile_ownership_select_own
  ON vehicle.profile_ownership
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY profile_ownership_insert_own_created_profile
  ON vehicle.profile_ownership
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND is_current = TRUE
    AND EXISTS (
      SELECT 1
      FROM vehicle.vehicle_profiles vp
      WHERE vp.id = profile_ownership.vehicle_profile_id
        AND vp.created_by = auth.uid()
    )
  );

CREATE POLICY profile_ownership_update_own
  ON vehicle.profile_ownership
  FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY profile_ownership_service_role_all
  ON vehicle.profile_ownership
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY profile_media_select_public_active_listing
  ON vehicle.profile_media
  FOR SELECT
  TO anon, authenticated
  USING (vehicle.has_active_listing(vehicle_profile_id));

CREATE POLICY profile_media_insert_owner
  ON vehicle.profile_media
  FOR INSERT
  TO authenticated
  WITH CHECK (vehicle.is_current_profile_owner(vehicle_profile_id));

CREATE POLICY profile_media_update_owner
  ON vehicle.profile_media
  FOR UPDATE
  TO authenticated
  USING (vehicle.is_current_profile_owner(vehicle_profile_id))
  WITH CHECK (vehicle.is_current_profile_owner(vehicle_profile_id));

CREATE POLICY profile_media_delete_owner
  ON vehicle.profile_media
  FOR DELETE
  TO authenticated
  USING (vehicle.is_current_profile_owner(vehicle_profile_id));

CREATE POLICY profile_media_service_role_all
  ON vehicle.profile_media
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

CREATE POLICY listings_select_active
  ON marketplace.listings
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY listings_select_own
  ON marketplace.listings
  FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

CREATE POLICY listings_insert_own
  ON marketplace.listings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    seller_id = auth.uid()
    AND vehicle.is_current_profile_owner(vehicle_profile_id)
  );

CREATE POLICY listings_update_own
  ON marketplace.listings
  FOR UPDATE
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (
    seller_id = auth.uid()
    AND vehicle.is_current_profile_owner(vehicle_profile_id)
  );

CREATE POLICY listings_delete_own_draft
  ON marketplace.listings
  FOR DELETE
  TO authenticated
  USING (seller_id = auth.uid() AND status = 'draft');

CREATE POLICY listings_service_role_all
  ON marketplace.listings
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT SELECT ON vehicle.makes TO anon, authenticated;
GRANT SELECT ON vehicle.models TO anon, authenticated;

GRANT SELECT ON vehicle.vehicle_profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON vehicle.vehicle_profiles TO authenticated;

GRANT SELECT ON vehicle.profile_ownership TO authenticated;
GRANT INSERT, UPDATE ON vehicle.profile_ownership TO authenticated;

GRANT SELECT ON vehicle.profile_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON vehicle.profile_media TO authenticated;

GRANT SELECT ON marketplace.listings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON marketplace.listings TO authenticated;

GRANT EXECUTE ON FUNCTION vehicle.is_current_profile_owner(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION vehicle.has_active_listing(UUID) TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA vehicle TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA marketplace TO service_role;

COMMIT;

