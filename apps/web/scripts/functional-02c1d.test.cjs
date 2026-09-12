const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const database = ['exec', 'supabase_db_Otoyali-blueprint', 'psql', '-q', '-U', 'postgres', '-d', 'postgres', '-Atc'];
const query = (sql) => execFileSync('docker', [...database, sql], { encoding: 'utf8' }).trim();

const reconciliation = query(`SELECT
  (SELECT count(*)
   FROM marketplace.listings AS l
   WHERE marketplace.is_listing_search_eligible(l.id)),
  (SELECT count(*) FROM marketplace.listing_search_documents),
  (SELECT count(*)
   FROM marketplace.listing_search_documents AS d
   WHERE NOT marketplace.is_listing_search_eligible(d.listing_id)),
  (SELECT count(*)
   FROM marketplace.listings AS l
   WHERE marketplace.is_listing_search_eligible(l.id)
     AND NOT EXISTS (
       SELECT 1 FROM marketplace.listing_search_documents AS d
       WHERE d.listing_id = l.id
     ));`).split('|').map(Number);
assert.deepEqual(reconciliation.slice(2), [0, 0], 'backfill must expose no ineligible listing and omit no eligible listing');
assert.equal(reconciliation[0], reconciliation[1], 'projection count must exactly match eligible listing count');

const roleMatrix = query(`SELECT
  has_table_privilege('anon', 'marketplace.listing_search_documents', 'SELECT'),
  has_table_privilege('authenticated', 'marketplace.listing_search_documents', 'SELECT'),
  has_table_privilege('anon', 'marketplace.listing_search_documents', 'INSERT'),
  has_table_privilege('authenticated', 'marketplace.listing_search_documents', 'UPDATE'),
  has_function_privilege('anon', 'marketplace.is_listing_search_eligible(uuid)', 'EXECUTE'),
  has_function_privilege('authenticated', 'marketplace.is_listing_search_eligible(uuid)', 'EXECUTE'),
  has_function_privilege('anon', 'marketplace.refresh_listing_search_document(uuid)', 'EXECUTE'),
  has_function_privilege('authenticated', 'marketplace.refresh_listing_search_document(uuid)', 'EXECUTE'),
  has_function_privilege('service_role', 'marketplace.refresh_listing_search_document(uuid)', 'EXECUTE');`).split('|');
assert.deepEqual(roleMatrix, ['t', 't', 'f', 'f', 'f', 'f', 'f', 'f', 't'], 'public projection read access and internal refresh privileges must remain isolated');

const anonymousRows = Number(query(`BEGIN;
  SET LOCAL ROLE anon;
  SELECT count(*) FROM marketplace.listing_search_documents;
  ROLLBACK;`));
assert.equal(anonymousRows, reconciliation[1], 'anon read path must expose exactly the reconciled public projection');

console.log('FUNCTIONAL-02C1D eligible backfill and privacy/runtime matrix passed');
