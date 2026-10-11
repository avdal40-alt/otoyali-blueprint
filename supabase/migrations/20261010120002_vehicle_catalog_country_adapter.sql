BEGIN;

-- Shared catalog entities remain country-neutral. Availability is a separate
-- configuration layer so adding a market never forks catalog business logic.
ALTER TABLE vehicle.variants
  ADD COLUMN generation_id UUID;

ALTER TABLE vehicle.variants
  ADD CONSTRAINT vehicle_variants_generation_model_fk
  FOREIGN KEY (generation_id, model_id)
  REFERENCES vehicle.generations (id, model_id)
  ON DELETE RESTRICT;

CREATE TABLE vehicle.catalog_country_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
  make_id UUID NOT NULL REFERENCES vehicle.makes(id) ON DELETE CASCADE,
  model_id UUID REFERENCES vehicle.models(id) ON DELETE CASCADE,
  generation_id UUID REFERENCES vehicle.generations(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES vehicle.variants(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT catalog_country_availability_one_level_chk CHECK (
    (model_id IS NULL AND generation_id IS NULL AND variant_id IS NULL)
    OR (model_id IS NOT NULL AND generation_id IS NULL AND variant_id IS NULL)
    OR (model_id IS NOT NULL AND generation_id IS NOT NULL AND variant_id IS NULL)
    OR (model_id IS NOT NULL AND generation_id IS NOT NULL AND variant_id IS NOT NULL)
  )
);

ALTER TABLE vehicle.catalog_country_availability
  ADD CONSTRAINT catalog_country_availability_model_make_fk
    FOREIGN KEY (model_id, make_id) REFERENCES vehicle.models (id, make_id) ON DELETE CASCADE,
  ADD CONSTRAINT catalog_country_availability_generation_model_fk
    FOREIGN KEY (generation_id, model_id) REFERENCES vehicle.generations (id, model_id) ON DELETE CASCADE,
  ADD CONSTRAINT catalog_country_availability_variant_model_fk
    FOREIGN KEY (variant_id, model_id) REFERENCES vehicle.variants (id, model_id) ON DELETE CASCADE;

COMMENT ON TABLE vehicle.catalog_country_availability IS
  'Country configuration for the shared vehicle catalog; rows never duplicate catalog entities.';

CREATE INDEX catalog_country_availability_lookup_idx
  ON vehicle.catalog_country_availability (country_code, is_active, make_id, model_id);
CREATE UNIQUE INDEX catalog_country_availability_scope_unique_idx
  ON vehicle.catalog_country_availability
  (country_code, make_id, COALESCE(model_id, '00000000-0000-0000-0000-000000000000'::UUID),
   COALESCE(generation_id, '00000000-0000-0000-0000-000000000000'::UUID),
   COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::UUID));

CREATE OR REPLACE FUNCTION public.get_vehicle_catalog(p_country_code TEXT DEFAULT NULL)
RETURNS TABLE (
  entity_type TEXT,
  entity_id UUID,
  parent_id UUID,
  name TEXT,
  slug TEXT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = vehicle, public, pg_catalog
AS $$
  WITH available AS (
    SELECT a.make_id, a.model_id, a.generation_id, a.variant_id
    FROM vehicle.catalog_country_availability AS a
    WHERE a.is_active
      AND (p_country_code IS NULL OR a.country_code = upper(p_country_code))
  )
  SELECT 'make'::TEXT AS entity_type, m.id AS entity_id, NULL::UUID AS parent_id, m.name AS name, m.slug AS slug
  FROM vehicle.makes AS m
  WHERE m.is_active AND (p_country_code IS NULL OR EXISTS (SELECT 1 FROM available a WHERE a.make_id = m.id))
  UNION ALL
  SELECT 'model', mo.id, mo.make_id, mo.name, mo.slug
  FROM vehicle.models AS mo
  WHERE mo.is_active AND (p_country_code IS NULL OR EXISTS (SELECT 1 FROM available a WHERE a.model_id = mo.id OR a.make_id = mo.make_id))
  UNION ALL
  SELECT 'generation', g.id, g.model_id, g.name, g.slug
  FROM vehicle.generations AS g
  WHERE g.is_active AND (p_country_code IS NULL OR EXISTS (SELECT 1 FROM available a WHERE a.generation_id = g.id OR a.model_id = g.model_id))
  UNION ALL
  SELECT 'variant', v.id, v.model_id, v.name, v.slug
  FROM vehicle.variants AS v
  WHERE v.is_active AND (p_country_code IS NULL OR EXISTS (SELECT 1 FROM available a WHERE a.variant_id = v.id OR a.generation_id = v.generation_id OR a.model_id = v.model_id))
  ORDER BY entity_type, name;
$$;

ALTER TABLE vehicle.catalog_country_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY vehicle_catalog_country_availability_select_active
  ON vehicle.catalog_country_availability FOR SELECT TO anon, authenticated
  USING (is_active);
CREATE POLICY vehicle_catalog_country_availability_service_role_all ON vehicle.catalog_country_availability FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

GRANT SELECT ON vehicle.catalog_country_availability TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_vehicle_catalog(TEXT) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
