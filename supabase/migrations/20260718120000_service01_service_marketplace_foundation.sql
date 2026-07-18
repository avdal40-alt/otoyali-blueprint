-- SERVICE-01: service marketplace foundation.
-- This migration creates only the minimal persistent service domain needed for
-- public discovery and provider applications. It does not implement bookings,
-- calendars, staff, work orders, payments, reviews, or service history.

CREATE SCHEMA IF NOT EXISTS service_marketplace;

GRANT USAGE ON SCHEMA service_marketplace TO anon, authenticated, service_role;

CREATE TABLE service_marketplace.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key TEXT NOT NULL UNIQUE,
  seo_slug TEXT NOT NULL UNIQUE,
  icon_name TEXT,
  supported_verticals TEXT[] NOT NULL DEFAULT ARRAY['cars']::TEXT[],
  availability_status TEXT NOT NULL DEFAULT 'preview',
  booking_readiness TEXT NOT NULL DEFAULT 'planned',
  emergency_relevant BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT service_categories_key_format CHECK (category_key ~ '^[a-z0-9_]+$'),
  CONSTRAINT service_categories_slug_format CHECK (seo_slug ~ '^[a-z0-9-]+$'),
  CONSTRAINT service_categories_availability_check CHECK (availability_status IN ('available', 'preview', 'coming_soon', 'disabled')),
  CONSTRAINT service_categories_booking_readiness_check CHECK (booking_readiness IN ('request_ready', 'planned', 'disabled')),
  CONSTRAINT service_categories_supported_verticals_check CHECK (
    cardinality(supported_verticals) > 0
    AND supported_verticals <@ ARRAY['cars', 'commercial', 'marine', 'parts', 'services', 'insurance', 'motorcycles', 'machinery', 'mobility']::TEXT[]
  )
);

CREATE TABLE service_marketplace.providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  business_name TEXT NOT NULL,
  public_summary TEXT,
  website_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  moderation_note TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT service_providers_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT service_providers_business_name_length CHECK (char_length(btrim(business_name)) BETWEEN 2 AND 160),
  CONSTRAINT service_providers_summary_length CHECK (public_summary IS NULL OR char_length(public_summary) <= 1200),
  CONSTRAINT service_providers_website_url_check CHECK (website_url IS NULL OR website_url ~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?(/.*)?$'),
  CONSTRAINT service_providers_status_check CHECK (status IN ('draft', 'pending_review', 'active', 'suspended', 'rejected', 'archived')),
  CONSTRAINT service_providers_verification_status_check CHECK (verification_status IN ('unverified', 'platform_reviewed'))
);

CREATE TABLE service_marketplace.branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES service_marketplace.providers(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  public_description TEXT,
  city TEXT NOT NULL,
  district TEXT,
  public_address TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT service_branches_provider_slug_unique UNIQUE (provider_id, slug),
  CONSTRAINT service_branches_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT service_branches_name_length CHECK (char_length(btrim(branch_name)) BETWEEN 2 AND 160),
  CONSTRAINT service_branches_description_length CHECK (public_description IS NULL OR char_length(public_description) <= 1200),
  CONSTRAINT service_branches_city_length CHECK (char_length(btrim(city)) BETWEEN 2 AND 80),
  CONSTRAINT service_branches_district_length CHECK (district IS NULL OR char_length(district) <= 80),
  CONSTRAINT service_branches_address_length CHECK (public_address IS NULL OR char_length(public_address) <= 300),
  CONSTRAINT service_branches_status_check CHECK (status IN ('draft', 'pending_review', 'active', 'temporarily_closed', 'suspended', 'archived'))
);

CREATE TABLE service_marketplace.offerings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES service_marketplace.branches(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES service_marketplace.categories(id) ON DELETE RESTRICT,
  display_name TEXT NOT NULL,
  description TEXT,
  pricing_mode TEXT NOT NULL DEFAULT 'quote_required',
  price_min_amount BIGINT,
  price_max_amount BIGINT,
  currency CHAR(3) NOT NULL DEFAULT 'TRY',
  duration_min_minutes INTEGER,
  duration_max_minutes INTEGER,
  booking_mode TEXT NOT NULL DEFAULT 'request_only',
  status TEXT NOT NULL DEFAULT 'draft',
  supported_verticals TEXT[] NOT NULL DEFAULT ARRAY['cars']::TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT service_offerings_display_name_length CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 160),
  CONSTRAINT service_offerings_description_length CHECK (description IS NULL OR char_length(description) <= 1600),
  CONSTRAINT service_offerings_notes_length CHECK (notes IS NULL OR char_length(notes) <= 1000),
  CONSTRAINT service_offerings_pricing_mode_check CHECK (pricing_mode IN ('fixed', 'starting_from', 'range', 'quote_required', 'unavailable')),
  CONSTRAINT service_offerings_price_amounts_check CHECK (
    (price_min_amount IS NULL OR price_min_amount >= 0)
    AND (price_max_amount IS NULL OR price_max_amount >= 0)
    AND (price_min_amount IS NULL OR price_max_amount IS NULL OR price_max_amount >= price_min_amount)
  ),
  CONSTRAINT service_offerings_currency_check CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT service_offerings_duration_check CHECK (
    (duration_min_minutes IS NULL OR duration_min_minutes > 0)
    AND (duration_max_minutes IS NULL OR duration_max_minutes > 0)
    AND (duration_min_minutes IS NULL OR duration_max_minutes IS NULL OR duration_max_minutes >= duration_min_minutes)
  ),
  CONSTRAINT service_offerings_booking_mode_check CHECK (booking_mode IN ('request_only', 'instant_booking_future', 'contact_provider', 'unavailable')),
  CONSTRAINT service_offerings_status_check CHECK (status IN ('draft', 'pending_review', 'active', 'suspended', 'archived')),
  CONSTRAINT service_offerings_supported_verticals_check CHECK (
    cardinality(supported_verticals) > 0
    AND supported_verticals <@ ARRAY['cars', 'commercial', 'marine', 'parts', 'services', 'insurance', 'motorcycles', 'machinery', 'mobility']::TEXT[]
  )
);

CREATE TABLE service_marketplace.provider_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_id UUID NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending_review',
  business_name TEXT NOT NULL,
  contact_person_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT,
  category_keys TEXT[] NOT NULL,
  supported_verticals TEXT[] NOT NULL DEFAULT ARRAY['cars']::TEXT[],
  website_url TEXT,
  notes TEXT,
  consent_accuracy BOOLEAN NOT NULL DEFAULT false,
  moderation_note TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT service_provider_applications_status_check CHECK (status IN ('pending_review', 'reviewing', 'approved', 'rejected', 'archived')),
  CONSTRAINT service_provider_applications_business_name_length CHECK (char_length(btrim(business_name)) BETWEEN 2 AND 160),
  CONSTRAINT service_provider_applications_contact_name_length CHECK (char_length(btrim(contact_person_name)) BETWEEN 2 AND 120),
  CONSTRAINT service_provider_applications_phone_length CHECK (char_length(btrim(contact_phone)) BETWEEN 8 AND 32),
  CONSTRAINT service_provider_applications_city_length CHECK (char_length(btrim(city)) BETWEEN 2 AND 80),
  CONSTRAINT service_provider_applications_district_length CHECK (district IS NULL OR char_length(district) <= 80),
  CONSTRAINT service_provider_applications_categories_required CHECK (cardinality(category_keys) > 0),
  CONSTRAINT service_provider_applications_category_keys_format CHECK (array_to_string(category_keys, ',') ~ '^[a-z0-9_,]+$'),
  CONSTRAINT service_provider_applications_supported_verticals_check CHECK (
    cardinality(supported_verticals) > 0
    AND supported_verticals <@ ARRAY['cars', 'commercial', 'marine', 'parts', 'services', 'insurance', 'motorcycles', 'machinery', 'mobility']::TEXT[]
  ),
  CONSTRAINT service_provider_applications_website_url_check CHECK (website_url IS NULL OR website_url ~ '^https://[A-Za-z0-9.-]+(:[0-9]+)?(/.*)?$'),
  CONSTRAINT service_provider_applications_notes_length CHECK (notes IS NULL OR char_length(notes) <= 1600),
  CONSTRAINT service_provider_applications_consent_required CHECK (consent_accuracy = true)
);

CREATE INDEX IF NOT EXISTS service_categories_active_sort_idx
  ON service_marketplace.categories (is_active, sort_order);

CREATE INDEX IF NOT EXISTS service_providers_status_published_idx
  ON service_marketplace.providers (status, published_at DESC);

CREATE INDEX IF NOT EXISTS service_providers_owner_idx
  ON service_marketplace.providers (owner_id);

CREATE INDEX IF NOT EXISTS service_branches_provider_status_idx
  ON service_marketplace.branches (provider_id, status);

CREATE INDEX IF NOT EXISTS service_branches_public_location_idx
  ON service_marketplace.branches (status, city, district);

CREATE INDEX IF NOT EXISTS service_offerings_branch_status_idx
  ON service_marketplace.offerings (branch_id, status);

CREATE INDEX IF NOT EXISTS service_offerings_category_status_idx
  ON service_marketplace.offerings (category_id, status);

CREATE INDEX IF NOT EXISTS service_provider_applications_submitter_created_idx
  ON service_marketplace.provider_applications (submitter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS service_provider_applications_status_created_idx
  ON service_marketplace.provider_applications (status, created_at DESC);

CREATE OR REPLACE FUNCTION service_marketplace.prepare_provider_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = service_marketplace, public
AS $$
DECLARE
  invalid_category TEXT;
BEGIN
  IF TG_OP = 'INSERT' AND auth.uid() IS NOT NULL THEN
    NEW.submitter_id := auth.uid();
    NEW.status := 'pending_review';
    NEW.moderation_note := NULL;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
  END IF;

  NEW.business_name := regexp_replace(btrim(NEW.business_name), '\s+', ' ', 'g');
  NEW.contact_person_name := regexp_replace(btrim(NEW.contact_person_name), '\s+', ' ', 'g');
  NEW.contact_phone := regexp_replace(btrim(NEW.contact_phone), '\s+', ' ', 'g');
  NEW.city := regexp_replace(btrim(NEW.city), '\s+', ' ', 'g');
  NEW.district := NULLIF(regexp_replace(btrim(COALESCE(NEW.district, '')), '\s+', ' ', 'g'), '');
  NEW.website_url := NULLIF(btrim(COALESCE(NEW.website_url, '')), '');
  NEW.notes := NULLIF(regexp_replace(btrim(COALESCE(NEW.notes, '')), '\s+', ' ', 'g'), '');

  NEW.category_keys := ARRAY(
    SELECT DISTINCT lower(btrim(item))
    FROM unnest(NEW.category_keys) AS item
    WHERE btrim(item) <> ''
    ORDER BY lower(btrim(item))
  );

  NEW.supported_verticals := ARRAY(
    SELECT DISTINCT lower(btrim(item))
    FROM unnest(NEW.supported_verticals) AS item
    WHERE btrim(item) <> ''
    ORDER BY lower(btrim(item))
  );

  SELECT item
  INTO invalid_category
  FROM unnest(NEW.category_keys) AS item
  WHERE NOT EXISTS (
    SELECT 1
    FROM service_marketplace.categories category
    WHERE category.category_key = item
      AND category.is_active = true
  )
  LIMIT 1;

  IF invalid_category IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid service category: %', invalid_category USING ERRCODE = '23514';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER service_provider_applications_prepare
  BEFORE INSERT OR UPDATE ON service_marketplace.provider_applications
  FOR EACH ROW
  EXECUTE FUNCTION service_marketplace.prepare_provider_application();

CREATE TRIGGER service_categories_set_updated_at
  BEFORE UPDATE ON service_marketplace.categories
  FOR EACH ROW
  EXECUTE FUNCTION identity.set_updated_at();

CREATE TRIGGER service_providers_set_updated_at
  BEFORE UPDATE ON service_marketplace.providers
  FOR EACH ROW
  EXECUTE FUNCTION identity.set_updated_at();

CREATE TRIGGER service_branches_set_updated_at
  BEFORE UPDATE ON service_marketplace.branches
  FOR EACH ROW
  EXECUTE FUNCTION identity.set_updated_at();

CREATE TRIGGER service_offerings_set_updated_at
  BEFORE UPDATE ON service_marketplace.offerings
  FOR EACH ROW
  EXECUTE FUNCTION identity.set_updated_at();

INSERT INTO service_marketplace.categories (
  id,
  category_key,
  seo_slug,
  icon_name,
  supported_verticals,
  availability_status,
  booking_readiness,
  emergency_relevant,
  sort_order
) VALUES
  ('90000000-0000-0000-0000-000000000001', 'periodic_maintenance', 'periyodik-bakim', 'service', ARRAY['cars', 'commercial', 'motorcycles']::TEXT[], 'preview', 'planned', false, 10),
  ('90000000-0000-0000-0000-000000000002', 'diagnostics', 'ariza-tespit', 'service', ARRAY['cars', 'commercial', 'motorcycles']::TEXT[], 'preview', 'planned', false, 20),
  ('90000000-0000-0000-0000-000000000003', 'engine_repair', 'motor-onarimi', 'service', ARRAY['cars', 'commercial', 'motorcycles', 'marine']::TEXT[], 'preview', 'planned', false, 30),
  ('90000000-0000-0000-0000-000000000004', 'transmission', 'sanziman', 'service', ARRAY['cars', 'commercial']::TEXT[], 'preview', 'planned', false, 40),
  ('90000000-0000-0000-0000-000000000005', 'brakes', 'fren', 'service', ARRAY['cars', 'commercial', 'motorcycles']::TEXT[], 'preview', 'planned', false, 50),
  ('90000000-0000-0000-0000-000000000006', 'suspension', 'suspansiyon', 'service', ARRAY['cars', 'commercial', 'motorcycles']::TEXT[], 'preview', 'planned', false, 60),
  ('90000000-0000-0000-0000-000000000007', 'electrical', 'elektrik', 'service', ARRAY['cars', 'commercial', 'motorcycles', 'marine']::TEXT[], 'preview', 'planned', false, 70),
  ('90000000-0000-0000-0000-000000000008', 'air_conditioning', 'klima', 'service', ARRAY['cars', 'commercial']::TEXT[], 'preview', 'planned', false, 80),
  ('90000000-0000-0000-0000-000000000009', 'tires', 'lastik', 'parts', ARRAY['cars', 'commercial', 'motorcycles']::TEXT[], 'preview', 'planned', false, 90),
  ('90000000-0000-0000-0000-000000000010', 'battery', 'aku', 'service', ARRAY['cars', 'commercial', 'motorcycles', 'marine']::TEXT[], 'preview', 'planned', false, 100),
  ('90000000-0000-0000-0000-000000000011', 'oil_change', 'yag-degisimi', 'service', ARRAY['cars', 'commercial', 'motorcycles', 'marine']::TEXT[], 'preview', 'planned', false, 110),
  ('90000000-0000-0000-0000-000000000012', 'body_repair', 'kaporta', 'service', ARRAY['cars', 'commercial', 'motorcycles']::TEXT[], 'preview', 'planned', false, 120),
  ('90000000-0000-0000-0000-000000000013', 'paint', 'boya', 'service', ARRAY['cars', 'commercial', 'motorcycles', 'marine']::TEXT[], 'preview', 'planned', false, 130),
  ('90000000-0000-0000-0000-000000000014', 'glass', 'cam', 'service', ARRAY['cars', 'commercial']::TEXT[], 'preview', 'planned', false, 140),
  ('90000000-0000-0000-0000-000000000015', 'detailing', 'detailing', 'service', ARRAY['cars', 'commercial', 'marine', 'motorcycles']::TEXT[], 'preview', 'planned', false, 150),
  ('90000000-0000-0000-0000-000000000016', 'car_wash', 'oto-yikama', 'service', ARRAY['cars', 'commercial', 'motorcycles']::TEXT[], 'preview', 'planned', false, 160),
  ('90000000-0000-0000-0000-000000000017', 'inspection', 'ekspertiz', 'shield', ARRAY['cars', 'commercial', 'motorcycles']::TEXT[], 'preview', 'planned', false, 170),
  ('90000000-0000-0000-0000-000000000018', 'towing', 'cekici', 'truck', ARRAY['cars', 'commercial', 'motorcycles']::TEXT[], 'preview', 'planned', true, 180),
  ('90000000-0000-0000-0000-000000000019', 'ev_service', 'elektrikli-arac-servisi', 'service', ARRAY['cars', 'commercial']::TEXT[], 'preview', 'planned', false, 190),
  ('90000000-0000-0000-0000-000000000020', 'marine_service', 'deniz-araci-servisi', 'ship', ARRAY['marine']::TEXT[], 'preview', 'planned', false, 200),
  ('90000000-0000-0000-0000-000000000021', 'commercial_vehicle_service', 'ticari-arac-servisi', 'truck', ARRAY['commercial']::TEXT[], 'preview', 'planned', false, 210),
  ('90000000-0000-0000-0000-000000000022', 'motorcycle_service', 'motosiklet-servisi', 'motorcycle', ARRAY['motorcycles']::TEXT[], 'preview', 'planned', false, 220),
  ('90000000-0000-0000-0000-000000000023', 'other', 'diger-servisler', 'service', ARRAY['cars', 'commercial', 'marine', 'motorcycles']::TEXT[], 'preview', 'planned', false, 990)
ON CONFLICT (category_key) DO UPDATE SET
  seo_slug = EXCLUDED.seo_slug,
  icon_name = EXCLUDED.icon_name,
  supported_verticals = EXCLUDED.supported_verticals,
  availability_status = EXCLUDED.availability_status,
  booking_readiness = EXCLUDED.booking_readiness,
  emergency_relevant = EXCLUDED.emergency_relevant,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();

ALTER TABLE service_marketplace.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_marketplace.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_marketplace.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_marketplace.offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_marketplace.provider_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_categories_public_select
  ON service_marketplace.categories
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY service_categories_admin_all
  ON service_marketplace.categories
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY service_categories_service_role_all
  ON service_marketplace.categories
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY service_providers_public_select_active
  ON service_marketplace.providers
  FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY service_providers_owner_select
  ON service_marketplace.providers
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY service_providers_admin_all
  ON service_marketplace.providers
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY service_providers_service_role_all
  ON service_marketplace.providers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY service_branches_public_select_active
  ON service_marketplace.branches
  FOR SELECT
  TO anon, authenticated
  USING (
    status IN ('active', 'temporarily_closed')
    AND EXISTS (
      SELECT 1
      FROM service_marketplace.providers provider
      WHERE provider.id = branches.provider_id
        AND provider.status = 'active'
    )
  );

CREATE POLICY service_branches_owner_select
  ON service_marketplace.branches
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM service_marketplace.providers provider
      WHERE provider.id = branches.provider_id
        AND provider.owner_id = auth.uid()
    )
  );

CREATE POLICY service_branches_admin_all
  ON service_marketplace.branches
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY service_branches_service_role_all
  ON service_marketplace.branches
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY service_offerings_public_select_active
  ON service_marketplace.offerings
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1
      FROM service_marketplace.branches branch
      JOIN service_marketplace.providers provider ON provider.id = branch.provider_id
      WHERE branch.id = offerings.branch_id
        AND branch.status = 'active'
        AND provider.status = 'active'
    )
  );

CREATE POLICY service_offerings_owner_select
  ON service_marketplace.offerings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM service_marketplace.branches branch
      JOIN service_marketplace.providers provider ON provider.id = branch.provider_id
      WHERE branch.id = offerings.branch_id
        AND provider.owner_id = auth.uid()
    )
  );

CREATE POLICY service_offerings_admin_all
  ON service_marketplace.offerings
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY service_offerings_service_role_all
  ON service_marketplace.offerings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY service_provider_applications_insert_own
  ON service_marketplace.provider_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    submitter_id = auth.uid()
    AND status = 'pending_review'
    AND consent_accuracy = true
  );

CREATE POLICY service_provider_applications_select_own
  ON service_marketplace.provider_applications
  FOR SELECT
  TO authenticated
  USING (submitter_id = auth.uid());

CREATE POLICY service_provider_applications_admin_all
  ON service_marketplace.provider_applications
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY service_provider_applications_service_role_all
  ON service_marketplace.provider_applications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE OR REPLACE VIEW public.service_public_categories
WITH (security_invoker = true) AS
SELECT
  category.id AS category_id,
  category.category_key,
  category.seo_slug,
  category.icon_name,
  category.supported_verticals,
  category.availability_status,
  category.booking_readiness,
  category.emergency_relevant,
  category.sort_order
FROM service_marketplace.categories category
WHERE category.is_active = true;

CREATE OR REPLACE VIEW public.service_public_providers
WITH (security_invoker = true) AS
SELECT
  provider.id AS provider_id,
  provider.slug AS provider_slug,
  provider.business_name,
  provider.public_summary,
  provider.website_url,
  provider.verification_status,
  MIN(branch.city) AS primary_city,
  MIN(branch.district) AS primary_district,
  COUNT(DISTINCT branch.id)::INTEGER AS branch_count,
  COALESCE(
    ARRAY_AGG(DISTINCT category.category_key) FILTER (WHERE category.category_key IS NOT NULL),
    ARRAY[]::TEXT[]
  ) AS service_category_keys,
  COALESCE(
    ARRAY_AGG(DISTINCT vertical_key.value) FILTER (WHERE vertical_key.value IS NOT NULL),
    ARRAY[]::TEXT[]
  ) AS supported_verticals,
  provider.published_at
FROM service_marketplace.providers provider
JOIN service_marketplace.branches branch
  ON branch.provider_id = provider.id
  AND branch.status = 'active'
LEFT JOIN service_marketplace.offerings offering
  ON offering.branch_id = branch.id
  AND offering.status = 'active'
LEFT JOIN service_marketplace.categories category
  ON category.id = offering.category_id
  AND category.is_active = true
LEFT JOIN LATERAL unnest(offering.supported_verticals) AS vertical_key(value)
  ON true
WHERE provider.status = 'active'
GROUP BY
  provider.id,
  provider.slug,
  provider.business_name,
  provider.public_summary,
  provider.website_url,
  provider.verification_status,
  provider.published_at;

CREATE OR REPLACE VIEW public.service_public_provider_details
WITH (security_invoker = true) AS
SELECT
  provider.id AS provider_id,
  provider.slug AS provider_slug,
  provider.business_name,
  provider.public_summary,
  provider.website_url,
  provider.verification_status,
  provider.published_at AS provider_published_at,
  branch.id AS branch_id,
  branch.slug AS branch_slug,
  branch.branch_name,
  branch.public_description AS branch_description,
  branch.city,
  branch.district,
  branch.public_address,
  branch.status AS branch_status,
  branch.published_at AS branch_published_at
FROM service_marketplace.providers provider
JOIN service_marketplace.branches branch
  ON branch.provider_id = provider.id
WHERE provider.status = 'active'
  AND branch.status IN ('active', 'temporarily_closed');

CREATE OR REPLACE VIEW public.service_public_offerings
WITH (security_invoker = true) AS
SELECT
  offering.id AS offering_id,
  provider.id AS provider_id,
  provider.slug AS provider_slug,
  branch.id AS branch_id,
  branch.slug AS branch_slug,
  category.id AS category_id,
  category.category_key,
  offering.display_name,
  offering.description,
  offering.pricing_mode,
  offering.price_min_amount,
  offering.price_max_amount,
  offering.currency,
  offering.duration_min_minutes,
  offering.duration_max_minutes,
  offering.booking_mode,
  offering.supported_verticals
FROM service_marketplace.offerings offering
JOIN service_marketplace.branches branch ON branch.id = offering.branch_id
JOIN service_marketplace.providers provider ON provider.id = branch.provider_id
JOIN service_marketplace.categories category ON category.id = offering.category_id
WHERE provider.status = 'active'
  AND branch.status = 'active'
  AND offering.status = 'active'
  AND category.is_active = true;

CREATE OR REPLACE VIEW public.service_admin_provider_applications AS
SELECT
  application.id AS application_id,
  application.submitter_id,
  application.status,
  application.business_name,
  application.contact_person_name,
  application.contact_phone,
  application.city,
  application.district,
  application.category_keys,
  application.supported_verticals,
  application.website_url,
  application.notes,
  application.consent_accuracy,
  application.moderation_note,
  application.reviewed_by,
  application.reviewed_at,
  application.created_at,
  application.updated_at
FROM service_marketplace.provider_applications application
WHERE public.is_admin(auth.uid());

GRANT SELECT ON service_marketplace.categories TO anon, authenticated;
GRANT SELECT (
  id,
  slug,
  business_name,
  public_summary,
  website_url,
  status,
  verification_status,
  published_at,
  created_at,
  updated_at
) ON service_marketplace.providers TO anon, authenticated;
GRANT SELECT (
  id,
  provider_id,
  slug,
  branch_name,
  public_description,
  city,
  district,
  public_address,
  status,
  published_at,
  created_at,
  updated_at
) ON service_marketplace.branches TO anon, authenticated;
GRANT SELECT (
  id,
  branch_id,
  category_id,
  display_name,
  description,
  pricing_mode,
  price_min_amount,
  price_max_amount,
  currency,
  duration_min_minutes,
  duration_max_minutes,
  booking_mode,
  status,
  supported_verticals,
  created_at,
  updated_at
) ON service_marketplace.offerings TO anon, authenticated;
GRANT SELECT (
  id,
  submitter_id,
  status,
  business_name,
  contact_person_name,
  contact_phone,
  city,
  district,
  category_keys,
  supported_verticals,
  website_url,
  notes,
  consent_accuracy,
  reviewed_at,
  created_at,
  updated_at
) ON service_marketplace.provider_applications TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON service_marketplace.categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON service_marketplace.providers TO authenticated;
GRANT INSERT, UPDATE, DELETE ON service_marketplace.branches TO authenticated;
GRANT INSERT, UPDATE, DELETE ON service_marketplace.offerings TO authenticated;
GRANT INSERT, UPDATE ON service_marketplace.provider_applications TO authenticated;

GRANT SELECT ON public.service_public_categories TO anon, authenticated;
GRANT SELECT ON public.service_public_providers TO anon, authenticated;
GRANT SELECT ON public.service_public_provider_details TO anon, authenticated;
GRANT SELECT ON public.service_public_offerings TO anon, authenticated;
GRANT SELECT ON public.service_admin_provider_applications TO authenticated;

GRANT EXECUTE ON FUNCTION service_marketplace.prepare_provider_application() TO authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA service_marketplace TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA service_marketplace TO service_role;

COMMENT ON SCHEMA service_marketplace IS 'Service marketplace foundation for providers, branches, offerings, and provider applications.';
COMMENT ON TABLE service_marketplace.provider_applications IS 'Private applications from authenticated users who want to join the service marketplace; not publicly readable.';
COMMENT ON VIEW public.service_public_providers IS 'Public active service provider discovery projection. Excludes private owner, application, and moderation data.';
