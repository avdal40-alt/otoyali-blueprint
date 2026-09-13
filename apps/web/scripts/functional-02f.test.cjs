const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260913120000_functional_02f_dealer_import_foundation.sql"), "utf8");
const contract = fs.readFileSync(path.join(root, "apps/web/src/lib/marketplace/dealer-import-contract.ts"), "utf8");

for (const expected of [
  "dealer_import_batches", "dealer_import_rows", "dealer_import_issues", "dealer_listing_external_ids",
  "UNIQUE (dealer_id, source, external_listing_id)", "validate_dealer_import_batch_owner", "validate_dealer_import_row_owner", "validate_dealer_listing_external_id_owner",
  "NEW.external_listing_id := btrim(NEW.external_listing_id)",
  "listing.seller_id = NEW.dealer_id", "dealer.seller_type = 'dealer'", "listing.seller_type = 'dealer'",
  "ENABLE ROW LEVEL SECURITY", "dealer_import_rows_select_own", "dealer_import_issues_select_own",
  "REVOKE ALL ON FUNCTION", "REVOKE ALL ON TABLE", "GRANT SELECT ON TABLE", "GRANT ALL ON TABLE", "TO service_role"
]) assert.ok(migration.includes(expected), expected);

assert.doesNotMatch(migration, /GRANT\s+(?:ALL|INSERT|UPDATE|DELETE)[^;]*\bTO\s+(?:anon|authenticated|public)\b/i);
assert.doesNotMatch(migration, /\b(?:DROP\s+(?:TABLE|SCHEMA|DATABASE)|TRUNCATE|DELETE\s+FROM)\b/i);
for (const value of ["excel", "upsert", "archive", "invalid", "normalizeDealerExternalListingId"]) {
  assert.ok(contract.includes(value), `contract value ${value}`);
}

const database = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...database, sql], { encoding: "utf8" }).trim();
const ownerId = query("SELECT seller_id FROM marketplace.listings ORDER BY id LIMIT 1");
const listingId = query("SELECT id FROM marketplace.listings WHERE seller_id = '" + ownerId + "' ORDER BY id LIMIT 1");
assert.match(ownerId, /^[0-9a-f-]{36}$/i, "local fixture must provide a listing owner");
assert.match(listingId, /^[0-9a-f-]{36}$/i, "local fixture must provide an owner listing");

const otherId = "00000000-0000-0000-0000-000000000f01";
const ownerBatch = "00000000-0000-0000-0000-000000000f11";
const otherBatch = "00000000-0000-0000-0000-000000000f12";
const ownerRow = "00000000-0000-0000-0000-000000000f21";
const ownerIssue = "00000000-0000-0000-0000-000000000f31";
const ownerExternal = "00000000-0000-0000-0000-000000000f41";
const setup = `
BEGIN;
INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('${otherId}', 'authenticated', 'authenticated', 'functional-02f-other@example.test', '{}', '{}', now(), now());
SET LOCAL ROLE service_role;
UPDATE public.profiles SET seller_type = 'dealer' WHERE id IN ('${ownerId}', '${otherId}');
UPDATE marketplace.listings SET seller_type = 'dealer' WHERE id = '${listingId}';
INSERT INTO marketplace.dealer_import_batches (id, dealer_id, source_sha256) VALUES
  ('${ownerBatch}', '${ownerId}', repeat('a', 64)),
  ('${otherBatch}', '${otherId}', repeat('b', 64));
INSERT INTO marketplace.dealer_import_rows (id, batch_id, row_number, external_listing_id)
  VALUES ('${ownerRow}', '${ownerBatch}', 1, ' row-external-id ');
INSERT INTO marketplace.dealer_import_issues (id, import_row_id, error_code)
  VALUES ('${ownerIssue}', '${ownerRow}', 'invalid_value');
INSERT INTO marketplace.dealer_listing_external_ids (id, dealer_id, external_listing_id, listing_id, last_seen_batch_id)
  VALUES ('${ownerExternal}', '${ownerId}', ' external-id ', '${listingId}', '${ownerBatch}');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '${ownerId}', true);
SELECT
  (SELECT count(*) FROM marketplace.dealer_import_batches) || '|' ||
  (SELECT count(*) FROM marketplace.dealer_import_rows) || '|' ||
  (SELECT count(*) FROM marketplace.dealer_import_issues) || '|' ||
  (SELECT count(*) FROM marketplace.dealer_listing_external_ids) || '|' ||
  (SELECT external_listing_id FROM marketplace.dealer_import_rows WHERE id = '${ownerRow}') || '|' ||
  (SELECT external_listing_id FROM marketplace.dealer_listing_external_ids WHERE id = '${ownerExternal}');
ROLLBACK;`;
assert.equal(query(setup).split("\n").at(-1), "1|1|1|1|row-external-id|external-id", "owner sees only normalized private import records");

const nonOwner = `
BEGIN;
INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('${otherId}', 'authenticated', 'authenticated', 'functional-02f-other@example.test', '{}', '{}', now(), now());
SET LOCAL ROLE service_role;
UPDATE public.profiles SET seller_type = 'dealer' WHERE id IN ('${ownerId}', '${otherId}');
UPDATE marketplace.listings SET seller_type = 'dealer' WHERE id = '${listingId}';
INSERT INTO marketplace.dealer_import_batches (id, dealer_id, source_sha256) VALUES
  ('${ownerBatch}', '${ownerId}', repeat('a', 64)),
  ('${otherBatch}', '${otherId}', repeat('b', 64));
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '${otherId}', true);
SELECT (SELECT count(*) FROM marketplace.dealer_import_batches) || '|' ||
  (SELECT count(*) FROM marketplace.dealer_import_rows) || '|' ||
  (SELECT count(*) FROM marketplace.dealer_import_issues) || '|' ||
  (SELECT count(*) FROM marketplace.dealer_listing_external_ids);
ROLLBACK;`;
assert.equal(query(nonOwner).split("\n").at(-1), "1|0|0|0", "non-owner cannot read another dealer import data");

assert.throws(() => query("BEGIN; SET LOCAL ROLE anon; SELECT * FROM marketplace.dealer_import_batches; ROLLBACK;"), /permission denied/i, "anon cannot read import data");
assert.throws(() => query(`BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${ownerId}', true); INSERT INTO marketplace.dealer_import_batches (dealer_id, source_sha256) VALUES ('${ownerId}', repeat('c', 64)); ROLLBACK;`), /permission denied/i, "authenticated clients cannot mutate import data");
assert.throws(() => query(`
BEGIN;
INSERT INTO auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('${otherId}', 'authenticated', 'authenticated', 'functional-02f-other@example.test', '{}', '{}', now(), now());
SET LOCAL ROLE service_role;
UPDATE public.profiles SET seller_type = 'dealer' WHERE id = '${ownerId}';
UPDATE marketplace.listings SET seller_type = 'dealer' WHERE id = '${listingId}';
INSERT INTO marketplace.dealer_import_batches (id, dealer_id, source_sha256) VALUES ('${ownerBatch}', '${ownerId}', repeat('a', 64));
INSERT INTO marketplace.dealer_listing_external_ids (dealer_id, external_listing_id, listing_id, last_seen_batch_id) VALUES ('${ownerId}', ' duplicate-id ', '${listingId}', '${ownerBatch}');
INSERT INTO marketplace.dealer_listing_external_ids (dealer_id, external_listing_id, listing_id, last_seen_batch_id) VALUES ('${ownerId}', 'duplicate-id', '${listingId}', '${ownerBatch}');
ROLLBACK;`), /duplicate key/i, "normalized dealer external IDs remain idempotent");

const privilegeMatrix = query("SELECT has_function_privilege('anon', 'marketplace.validate_dealer_import_batch_owner()', 'EXECUTE'), has_function_privilege('authenticated', 'marketplace.validate_dealer_import_row_owner()', 'EXECUTE'), has_function_privilege('service_role', 'marketplace.validate_dealer_listing_external_id_owner()', 'EXECUTE')");
assert.equal(privilegeMatrix, "f|f|f", "trigger helper functions are not directly executable");
console.log("FUNCTIONAL-02F dealer-import foundation passed");
