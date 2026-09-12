const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const database = ['exec', 'supabase_db_Otoyali-blueprint', 'psql', '-q', '-U', 'postgres', '-d', 'postgres', '-Atc'];
const query = (sql) => execFileSync('docker', [...database, sql], { encoding: 'utf8' }).trim();

const trigger = query(`SELECT t.tgname
  FROM pg_trigger AS t
  JOIN pg_class AS c ON c.oid = t.tgrelid
  JOIN pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'marketplace'
    AND c.relname = 'listings'
    AND t.tgname = 'listing_search_document_lifecycle_sync'
    AND NOT t.tgisinternal;`);
assert.equal(trigger, 'listing_search_document_lifecycle_sync', 'listing lifecycle trigger must be installed');

const result = query(`BEGIN;
  CREATE TEMP TABLE functional_02c1c_eligible ON COMMIT DROP AS
    SELECT l.id
    FROM marketplace.listings AS l
    JOIN vehicle.vehicle_profiles AS vp ON vp.id = l.vehicle_profile_id
    JOIN vehicle.makes AS ma ON ma.id = vp.make_id
    JOIN vehicle.models AS mo ON mo.id = vp.model_id
    WHERE l.status = 'active'
      AND l.moderation_status = 'active'
      AND vp.profile_status = 'active'
      AND ma.is_active = TRUE
      AND mo.is_active = TRUE
    ORDER BY l.id
    LIMIT 1;
  SELECT id FROM functional_02c1c_eligible;
  SELECT marketplace.refresh_listing_search_document((SELECT id FROM functional_02c1c_eligible));
  UPDATE marketplace.listings
  SET status = 'paused'
  WHERE id = (SELECT id FROM functional_02c1c_eligible);
  SELECT EXISTS (
    SELECT 1 FROM marketplace.listing_search_documents
    WHERE listing_id = (SELECT id FROM functional_02c1c_eligible)
  );
  UPDATE marketplace.listings
  SET status = 'active'
  WHERE id = (SELECT id FROM functional_02c1c_eligible);
  SELECT EXISTS (
    SELECT 1 FROM marketplace.listing_search_documents
    WHERE listing_id = (SELECT id FROM functional_02c1c_eligible)
  );
  ROLLBACK;`).split(/\r?\n/).filter(Boolean);

assert.equal(result.length, 3, 'lifecycle test requires one eligible local listing');
assert.equal(result[1], 'f', 'non-public lifecycle exit must remove the search document');
assert.equal(result[2], 't', 'eligible lifecycle entry must create the search document');

const privileges = query(`SELECT
  has_function_privilege('anon', 'marketplace.sync_listing_search_document_lifecycle()', 'EXECUTE'),
  has_function_privilege('authenticated', 'marketplace.sync_listing_search_document_lifecycle()', 'EXECUTE'),
  has_function_privilege('service_role', 'marketplace.sync_listing_search_document_lifecycle()', 'EXECUTE');`).split('|');
assert.deepEqual(privileges, ['f', 'f', 'f'], 'trigger function must not be directly callable');

console.log('FUNCTIONAL-02C1C lifecycle projection integration passed');
