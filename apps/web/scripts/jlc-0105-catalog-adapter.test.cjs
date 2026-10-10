const fs = require('fs');
const assert = require('assert');

const migration = fs.readFileSync(
  `${__dirname}/../../../supabase/migrations/20261010120000_vehicle_catalog_country_adapter.sql`,
  'utf8',
);

for (const fragment of [
  'CREATE TABLE vehicle.generations',
  'CREATE TABLE vehicle.catalog_country_availability',
  'CREATE OR REPLACE FUNCTION public.get_vehicle_catalog',
  'country_code TEXT NOT NULL',
  'GRANT EXECUTE ON FUNCTION public.get_vehicle_catalog(TEXT) TO anon, authenticated',
]) assert.ok(migration.includes(fragment), `missing ${fragment}`);

assert.ok(migration.includes('vehicle_models_id_make_unique_idx'));
assert.ok(migration.includes('catalog_country_availability_generation_model_fk'));
assert.ok(migration.includes('p_country_code IS NULL OR a.country_code = upper(p_country_code)'));
assert.ok(!migration.includes('Turkey') && !migration.includes('Türkiye'));
console.log('JLC-0105 catalog adapter contract passed');
