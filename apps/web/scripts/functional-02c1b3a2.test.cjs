const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const database = ['exec', 'supabase_db_Otoyali-blueprint', 'psql', '-q', '-U', 'postgres', '-d', 'postgres', '-Atc'];
const query = (sql) => execFileSync('docker', [...database, sql], { encoding: 'utf8' }).trim();

const publicColumns = [
  'listing_id', 'make_id', 'model_id', 'variant_id', 'make_name', 'model_name', 'variant_name',
  'condition', 'year', 'mileage_km', 'fuel_type', 'transmission', 'body_type', 'drive_type',
  'color', 'engine_volume_l', 'power_kw', 'battery_capacity_kwh', 'electric_range_km',
  'seller_service_declaration', 'seller_damage_declaration', 'price_amount', 'currency',
  'price_negotiable', 'trade_in_accepted', 'city_id', 'district_id', 'city_name', 'district_name',
  'seller_type', 'cover_image_url', 'photo_count', 'has_video', 'published_at', 'projected_at',
];

const columns = query(`SELECT string_agg(column_name, ',' ORDER BY ordinal_position)
  FROM information_schema.columns
  WHERE table_schema = 'marketplace' AND table_name = 'listing_search_documents'`).split(',');
assert.deepEqual(columns, publicColumns, 'public projection payload must have only the approved columns');

const functionDefinition = query("SELECT pg_get_functiondef('marketplace.refresh_listing_search_document(uuid)'::regprocedure)").toLowerCase();
for (const privateSource of [
  'private_vins', 'public.profiles', 'seller_damage_notes', 'vehicle_profile_field_provenance',
  'vehicle_profile_field_evidence', 'moderation_note', 'rejection_reason',
]) {
  assert.ok(!functionDefinition.includes(privateSource), `refresh must not source ${privateSource}`);
}

const anonColumns = query(`BEGIN;
  SET LOCAL ROLE anon;
  SELECT string_agg(column_name, ',' ORDER BY ordinal_position)
  FROM information_schema.columns
  WHERE table_schema = 'marketplace' AND table_name = 'listing_search_documents';
  ROLLBACK;`).split(',');
assert.deepEqual(anonColumns, publicColumns, 'anon payload metadata must expose only approved columns');

console.log('FUNCTIONAL-02C1B3A2 projection payload privacy validation passed');
