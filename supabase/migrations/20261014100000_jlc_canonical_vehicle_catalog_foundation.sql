BEGIN;

-- Jolcar-owned canonical catalog metadata. External sources may bootstrap or
-- verify this data, but never serve production runtime reads.
CREATE TYPE vehicle.catalog_record_origin AS ENUM ('manual', 'imported', 'corrected');
CREATE TYPE vehicle.catalog_entity_type AS ENUM ('make', 'model', 'generation', 'variant', 'modification');

CREATE TABLE vehicle.catalog_datasets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  source_version TEXT NOT NULL,
  content_sha256 TEXT NOT NULL,
  source_url TEXT,
  license_reference TEXT,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  CONSTRAINT catalog_datasets_source_name_not_empty_chk CHECK (char_length(trim(source_name)) > 0),
  CONSTRAINT catalog_datasets_source_version_not_empty_chk CHECK (char_length(trim(source_version)) > 0),
  CONSTRAINT catalog_datasets_content_sha256_chk CHECK (content_sha256 ~ '^[A-Fa-f0-9]{64}$'),
  CONSTRAINT catalog_datasets_metadata_object_chk CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT catalog_datasets_source_version_unique UNIQUE (source_name, source_version),
  CONSTRAINT catalog_datasets_content_sha256_unique UNIQUE (content_sha256)
);

COMMENT ON TABLE vehicle.catalog_datasets IS
  'Repository-controlled metadata for a source dataset used to bootstrap, verify, or update Jolcar canonical catalog data. It is not a runtime external dependency.';

ALTER TABLE vehicle.makes
  ADD COLUMN catalog_origin vehicle.catalog_record_origin NOT NULL DEFAULT 'manual',
  ADD COLUMN catalog_dataset_id UUID REFERENCES vehicle.catalog_datasets(id) ON DELETE RESTRICT,
  ADD COLUMN catalog_source_key TEXT,
  ADD COLUMN catalog_revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE vehicle.models
  ADD COLUMN catalog_origin vehicle.catalog_record_origin NOT NULL DEFAULT 'manual',
  ADD COLUMN catalog_dataset_id UUID REFERENCES vehicle.catalog_datasets(id) ON DELETE RESTRICT,
  ADD COLUMN catalog_source_key TEXT,
  ADD COLUMN catalog_revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE vehicle.generations
  ADD COLUMN catalog_origin vehicle.catalog_record_origin NOT NULL DEFAULT 'manual',
  ADD COLUMN catalog_dataset_id UUID REFERENCES vehicle.catalog_datasets(id) ON DELETE RESTRICT,
  ADD COLUMN catalog_source_key TEXT,
  ADD COLUMN catalog_revision INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN production_year_start SMALLINT,
  ADD COLUMN production_year_end SMALLINT;
ALTER TABLE vehicle.variants
  ADD COLUMN catalog_origin vehicle.catalog_record_origin NOT NULL DEFAULT 'manual',
  ADD COLUMN catalog_dataset_id UUID REFERENCES vehicle.catalog_datasets(id) ON DELETE RESTRICT,
  ADD COLUMN catalog_source_key TEXT,
  ADD COLUMN catalog_revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE vehicle.modifications
  ADD COLUMN catalog_origin vehicle.catalog_record_origin NOT NULL DEFAULT 'manual',
  ADD COLUMN catalog_dataset_id UUID REFERENCES vehicle.catalog_datasets(id) ON DELETE RESTRICT,
  ADD COLUMN catalog_source_key TEXT,
  ADD COLUMN catalog_revision INTEGER NOT NULL DEFAULT 1;

ALTER TABLE vehicle.makes ADD CONSTRAINT makes_catalog_provenance_chk CHECK (
  catalog_revision > 0 AND ((catalog_origin = 'manual' AND catalog_dataset_id IS NULL AND catalog_source_key IS NULL) OR (catalog_origin IN ('imported', 'corrected') AND catalog_dataset_id IS NOT NULL AND char_length(trim(catalog_source_key)) > 0))
);
ALTER TABLE vehicle.models ADD CONSTRAINT models_catalog_provenance_chk CHECK (
  catalog_revision > 0 AND ((catalog_origin = 'manual' AND catalog_dataset_id IS NULL AND catalog_source_key IS NULL) OR (catalog_origin IN ('imported', 'corrected') AND catalog_dataset_id IS NOT NULL AND char_length(trim(catalog_source_key)) > 0))
);
ALTER TABLE vehicle.generations ADD CONSTRAINT generations_catalog_provenance_chk CHECK (
  catalog_revision > 0 AND ((catalog_origin = 'manual' AND catalog_dataset_id IS NULL AND catalog_source_key IS NULL) OR (catalog_origin IN ('imported', 'corrected') AND catalog_dataset_id IS NOT NULL AND char_length(trim(catalog_source_key)) > 0))
);
ALTER TABLE vehicle.generations ADD CONSTRAINT generations_production_year_range_chk CHECK (
  (production_year_start IS NULL AND production_year_end IS NULL)
  OR (production_year_start BETWEEN 1886 AND 2100 AND production_year_end BETWEEN production_year_start AND 2100)
);
ALTER TABLE vehicle.variants ADD CONSTRAINT variants_catalog_provenance_chk CHECK (
  catalog_revision > 0 AND ((catalog_origin = 'manual' AND catalog_dataset_id IS NULL AND catalog_source_key IS NULL) OR (catalog_origin IN ('imported', 'corrected') AND catalog_dataset_id IS NOT NULL AND char_length(trim(catalog_source_key)) > 0))
);
ALTER TABLE vehicle.modifications ADD CONSTRAINT modifications_catalog_provenance_chk CHECK (
  catalog_revision > 0 AND ((catalog_origin = 'manual' AND catalog_dataset_id IS NULL AND catalog_source_key IS NULL) OR (catalog_origin IN ('imported', 'corrected') AND catalog_dataset_id IS NOT NULL AND char_length(trim(catalog_source_key)) > 0))
);

CREATE UNIQUE INDEX makes_catalog_dataset_source_key_unique_idx ON vehicle.makes (catalog_dataset_id, catalog_source_key) WHERE catalog_dataset_id IS NOT NULL;
CREATE UNIQUE INDEX models_catalog_dataset_source_key_unique_idx ON vehicle.models (catalog_dataset_id, catalog_source_key) WHERE catalog_dataset_id IS NOT NULL;
CREATE UNIQUE INDEX generations_catalog_dataset_source_key_unique_idx ON vehicle.generations (catalog_dataset_id, catalog_source_key) WHERE catalog_dataset_id IS NOT NULL;
CREATE UNIQUE INDEX variants_catalog_dataset_source_key_unique_idx ON vehicle.variants (catalog_dataset_id, catalog_source_key) WHERE catalog_dataset_id IS NOT NULL;
CREATE UNIQUE INDEX modifications_catalog_dataset_source_key_unique_idx ON vehicle.modifications (catalog_dataset_id, catalog_source_key) WHERE catalog_dataset_id IS NOT NULL;

CREATE TABLE vehicle.catalog_specifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modification_id UUID NOT NULL REFERENCES vehicle.modifications(id) ON DELETE RESTRICT,
  specification_code TEXT NOT NULL,
  value_number NUMERIC,
  value_text TEXT,
  value_boolean BOOLEAN,
  unit_code TEXT,
  catalog_origin vehicle.catalog_record_origin NOT NULL DEFAULT 'manual',
  catalog_dataset_id UUID REFERENCES vehicle.catalog_datasets(id) ON DELETE RESTRICT,
  catalog_source_key TEXT,
  catalog_revision INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT catalog_specifications_code_chk CHECK (specification_code ~ '^[a-z][a-z0-9_]{0,63}$'),
  CONSTRAINT catalog_specifications_one_value_chk CHECK (num_nonnulls(value_number, value_text, value_boolean) = 1),
  CONSTRAINT catalog_specifications_unit_chk CHECK (unit_code IS NULL OR unit_code ~ '^[a-z0-9_]{1,32}$'),
  CONSTRAINT catalog_specifications_provenance_chk CHECK (
    catalog_revision > 0 AND ((catalog_origin = 'manual' AND catalog_dataset_id IS NULL AND catalog_source_key IS NULL) OR (catalog_origin IN ('imported', 'corrected') AND catalog_dataset_id IS NOT NULL AND char_length(trim(catalog_source_key)) > 0))
  ),
  CONSTRAINT catalog_specifications_modification_code_unique UNIQUE (modification_id, specification_code),
  CONSTRAINT catalog_specifications_dataset_source_key_unique UNIQUE (catalog_dataset_id, catalog_source_key)
);

CREATE INDEX catalog_specifications_modification_idx ON vehicle.catalog_specifications (modification_id, specification_code);

CREATE TABLE vehicle.catalog_market_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL,
  entity_type vehicle.catalog_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  override_patch JSONB NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT catalog_market_overrides_country_code_chk CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT catalog_market_overrides_patch_object_chk CHECK (jsonb_typeof(override_patch) = 'object' AND override_patch <> '{}'::JSONB),
  CONSTRAINT catalog_market_overrides_reason_not_empty_chk CHECK (char_length(trim(reason)) > 0),
  CONSTRAINT catalog_market_overrides_scope_unique UNIQUE (country_code, entity_type, entity_id)
);

CREATE OR REPLACE FUNCTION vehicle.validate_catalog_market_override_target()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY INVOKER SET search_path = vehicle, pg_catalog AS $$
BEGIN
  IF NOT (CASE NEW.entity_type
    WHEN 'make' THEN EXISTS (SELECT 1 FROM vehicle.makes WHERE id = NEW.entity_id)
    WHEN 'model' THEN EXISTS (SELECT 1 FROM vehicle.models WHERE id = NEW.entity_id)
    WHEN 'generation' THEN EXISTS (SELECT 1 FROM vehicle.generations WHERE id = NEW.entity_id)
    WHEN 'variant' THEN EXISTS (SELECT 1 FROM vehicle.variants WHERE id = NEW.entity_id)
    WHEN 'modification' THEN EXISTS (SELECT 1 FROM vehicle.modifications WHERE id = NEW.entity_id)
  END) THEN
    RAISE EXCEPTION 'catalog market override target does not exist for entity type %', NEW.entity_type;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER catalog_specifications_set_updated_at BEFORE UPDATE ON vehicle.catalog_specifications FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();
CREATE TRIGGER catalog_market_overrides_set_updated_at BEFORE UPDATE ON vehicle.catalog_market_overrides FOR EACH ROW EXECUTE FUNCTION identity.set_updated_at();
CREATE TRIGGER catalog_market_overrides_validate_target BEFORE INSERT OR UPDATE OF entity_type, entity_id ON vehicle.catalog_market_overrides FOR EACH ROW EXECUTE FUNCTION vehicle.validate_catalog_market_override_target();

ALTER TABLE vehicle.catalog_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle.catalog_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle.catalog_market_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_specifications_select_active_modification ON vehicle.catalog_specifications FOR SELECT TO anon, authenticated USING (
  EXISTS (SELECT 1 FROM vehicle.modifications m JOIN vehicle.generations g ON g.id = m.generation_id JOIN vehicle.models mo ON mo.id = g.model_id JOIN vehicle.makes ma ON ma.id = mo.make_id WHERE m.id = catalog_specifications.modification_id AND m.is_active AND g.is_active AND mo.is_active AND ma.is_active)
);
CREATE POLICY catalog_datasets_service_role_all ON vehicle.catalog_datasets FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY catalog_specifications_service_role_all ON vehicle.catalog_specifications FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY catalog_market_overrides_service_role_all ON vehicle.catalog_market_overrides FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

GRANT SELECT ON vehicle.catalog_specifications TO anon, authenticated;
GRANT ALL ON vehicle.catalog_datasets, vehicle.catalog_specifications, vehicle.catalog_market_overrides TO service_role;

COMMENT ON TABLE vehicle.catalog_specifications IS 'Normalized Jolcar-owned specifications for a canonical modification. No catalog data is seeded by this migration.';
COMMENT ON TABLE vehicle.catalog_market_overrides IS 'Server-managed country-specific presentation or availability overrides for canonical catalog records; public catalog reads do not expose provenance metadata.';
NOTIFY pgrst, 'reload schema';
COMMIT;
