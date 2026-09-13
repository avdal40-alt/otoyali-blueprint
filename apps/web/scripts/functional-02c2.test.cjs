const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const database = ['exec', 'supabase_db_Otoyali-blueprint', 'psql', '-q', '-U', 'postgres', '-d', 'postgres', '-Atc'];
const query = (sql) => execFileSync('docker', [...database, sql], { encoding: 'utf8' }).trim();
const invoke = (request, role) => {
  const payload = JSON.stringify(request).replace(/'/g, "''");
  const roleClause = role ? `SET LOCAL ROLE ${role};` : '';
  return JSON.parse(query(`BEGIN; ${roleClause} SELECT marketplace.search_listings_v1('${payload}'::jsonb); ROLLBACK;`));
};
const publicFields = [
  'battery_capacity_kwh', 'body_type', 'city_id', 'city_name', 'color', 'condition', 'cover_image_url', 'currency',
  'district_id', 'district_name', 'drive_type', 'electric_range_km', 'engine_volume_l', 'fuel_type', 'has_video',
  'listing_id', 'make_id', 'make_name', 'mileage_km', 'model_id', 'model_name', 'photo_count', 'power_kw',
  'price_amount', 'price_negotiable', 'projected_at', 'published_at', 'seller_damage_declaration',
  'seller_service_declaration', 'seller_type', 'trade_in_accepted', 'transmission', 'variant_id', 'variant_name', 'year'
].sort();

for (const sort of ['newest', 'price_asc', 'price_desc', 'year_desc', 'mileage_asc']) {
  const request = { version: 'v1', limit: 1, sort, filters: { has_photos: false } };
  const result = invoke(request, 'anon');
  assert.equal(result.version, 'v1');
  assert.ok(Array.isArray(result.items));
  assert.ok(result.items.length <= 1);
  for (const item of result.items) {
    assert.deepEqual(Object.keys(item).sort(), publicFields, 'search response must contain only public projection fields');
    assert.equal(Object.prototype.hasOwnProperty.call(item, 'seller_id'), false);
    assert.equal(Object.prototype.hasOwnProperty.call(item, 'normalized_vin'), false);
  }
  if (result.next_cursor) {
    assert.equal(result.next_cursor.version, 'v1');
    assert.equal(result.next_cursor.sort, sort);
    const nextPage = invoke({ ...request, cursor: result.next_cursor }, 'anon');
    assert.ok(nextPage.items.every((item) => item.listing_id !== result.items[0]?.listing_id), 'keyset cursor must not repeat its anchor row');
  }
}

const permissions = query(`SELECT
  has_function_privilege('anon', 'marketplace.search_listings_v1(jsonb)', 'EXECUTE'),
  has_function_privilege('authenticated', 'marketplace.search_listings_v1(jsonb)', 'EXECUTE'),
  has_function_privilege('anon', 'marketplace.refresh_listing_search_document(uuid)', 'EXECUTE')`).split('|');
assert.deepEqual(permissions, ['t', 't', 'f']);

assert.throws(() => query(`SELECT marketplace.search_listings_v1('{"version":"v2"}'::jsonb)`));
assert.throws(() => query(`SELECT marketplace.search_listings_v1('{"version":"v1","filters":{"unknown":true}}'::jsonb)`));
assert.throws(() => query(`SELECT marketplace.search_listings_v1('{"version":"v1","unrecognized":true}'::jsonb)`));
assert.throws(() => query(`SELECT marketplace.search_listings_v1('{"version":"v1","limit":61}'::jsonb)`));
assert.throws(() => query(`SELECT marketplace.search_listings_v1('{"version":"v1","filters":{"year_min":999999999}}'::jsonb)`));
assert.throws(() => query(`SELECT marketplace.search_listings_v1('{"version":"v1","cursor":{"version":"v1","sort":"newest","listing_id":"00000000-0000-4000-8000-000000000000"}}'::jsonb)`));
console.log('FUNCTIONAL-02C2 public search request, pagination, and privacy contract passed');
