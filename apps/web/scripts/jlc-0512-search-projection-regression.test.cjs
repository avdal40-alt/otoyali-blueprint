const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261011100000_restore_search_video_projection.sql"), "utf8");
assert.match(migration, /marketplace\.is_listing_video_publicly_eligible/);
assert.match(migration, /has_video=EXCLUDED\.has_video/);
assert.match(migration, /raised_at=EXCLUDED\.raised_at/);
assert.match(migration, /SECURITY DEFINER SET search_path = marketplace, vehicle, pg_catalog/);
assert.doesNotMatch(migration, /,false,l\.published_at/);

const query = (sql) => execFileSync("docker", ["exec", "supabase_db_Otoyali-blueprint", "psql", "-X", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc", sql], { encoding: "utf8" }).trim();
const definition = query("SELECT pg_get_functiondef('marketplace.refresh_listing_search_document(uuid)'::regprocedure)");
assert.match(definition, /is_listing_video_publicly_eligible/);
assert.match(definition, /has_video=EXCLUDED\.has_video/);
assert.match(definition, /raised_at=EXCLUDED\.raised_at/);
assert.match(definition, /SECURITY DEFINER/);
assert.match(definition, /search_path TO 'marketplace', 'vehicle', 'pg_catalog'/);
assert.equal(query("SELECT has_function_privilege('anon', 'marketplace.refresh_listing_search_document(uuid)', 'EXECUTE')"), "f");
assert.equal(query("SELECT has_function_privilege('authenticated', 'marketplace.refresh_listing_search_document(uuid)', 'EXECUTE')"), "f");
assert.equal(query("SELECT has_function_privilege('service_role', 'marketplace.refresh_listing_search_document(uuid)', 'EXECUTE')"), "t");
console.log("JLC-0512 search projection regression: PASS");
