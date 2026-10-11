const fs = require('fs');
const assert = require('assert');
const path = require('path');

const migrations = path.join(__dirname, '../../../supabase/migrations');

const catalogFoundation = fs.readFileSync(
  path.join(
    migrations,
    '20261010120000_functional_08_vehicle_owner_reviews.sql',
  ),
  'utf8',
);

const migration = fs.readFileSync(
  path.join(
    migrations,
    '20261010120002_vehicle_catalog_country_adapter.sql',
  ),
  'utf8',
);

// generations is provided by the preceding shared vehicle-domain migration.
assert.ok(
  catalogFoundation.includes('CREATE TABLE vehicle.generations'),
  'missing vehicle.generations foundation',
);

// The country adapter must extend the shared catalog rather than recreate it.
assert.ok(
  !migration.includes('CREATE TABLE vehicle.generations'),
  'country adapter must not recreate vehicle.generations',
);

assert.ok(
  !migration.includes('vehicle_models_id_make_unique_idx'),
  'country adapter must not recreate the existing models composite unique key',
);

assert.ok(
  !migration.includes('vehicle_generations_select_active'),
  'country adapter must not recreate the existing generations read policy',
);

for (const fragment of [
  'ADD COLUMN generation_id UUID',
  'vehicle_variants_generation_model_fk',
  'CREATE TABLE vehicle.catalog_country_availability',
  'catalog_country_availability_generation_model_fk',
  'CREATE OR REPLACE FUNCTION public.get_vehicle_catalog',
  'country_code TEXT NOT NULL',
  "'make'::TEXT AS entity_type",
  'p_country_code IS NULL OR a.country_code = upper(p_country_code)',
  'GRANT EXECUTE ON FUNCTION public.get_vehicle_catalog(TEXT) TO anon, authenticated',
]) {
  assert.ok(migration.includes(fragment), `missing ${fragment}`);
}

assert.ok(
  !migration.includes('Turkey') &&
    !migration.includes('Türkiye'),
  'country adapter must remain country-neutral',
);

console.log('JLC-0105 catalog adapter contract passed');