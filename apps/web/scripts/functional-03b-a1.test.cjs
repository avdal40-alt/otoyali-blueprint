const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(
  path.join(root, "supabase", "migrations", "20260921070609_functional_03b_a1_saved_search_security_contract.sql"),
  "utf8"
);
for (const token of [
  "ADD COLUMN criteria_version TEXT",
  "ADD COLUMN search_request JSONB",
  "pg_advisory_xact_lock",
  "marketplace.search_listings_v1(v_request)",
  "REVOKE ALL ON TABLE marketplace.saved_searches FROM PUBLIC, anon, authenticated, service_role",
  "SECURITY DEFINER",
  "SET search_path = ''"
]) assert.ok(migration.includes(token), token);

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["owner", "other", "staff"].map((name) => [name, randomUUID()]));
const claims = (role, sub) => JSON.stringify({ role, ...(sub ? { sub } : {}) }).replaceAll("'", "''");
const role = (name, sub) => `RESET ROLE; SET LOCAL ROLE ${name}; SET LOCAL request.jwt.claims TO '${claims(name, sub)}';`;
const validRequest = `'${JSON.stringify({ version: "v1", filters: { q: "Yolmod" }, sort: "newest", limit: 24 }).replaceAll("'", "''")}'::jsonb`;
const invalidRequest = `'${JSON.stringify({ version: "v2", filters: {} }).replaceAll("'", "''")}'::jsonb`;
const malformedRequest = `'${JSON.stringify({ version: "v1", filters: { unsupported: true } }).replaceAll("'", "''")}'::jsonb`;

const sql = `BEGIN;
  CREATE TEMP TABLE results (name text primary key, ok boolean not null) ON COMMIT DROP;
  GRANT SELECT, INSERT ON results TO anon, authenticated;
  INSERT INTO auth.users (instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
    ('00000000-0000-0000-0000-000000000000','${ids.owner}','authenticated','authenticated','owner-${ids.owner}@test.invalid','{}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','${ids.other}','authenticated','authenticated','other-${ids.other}@test.invalid','{}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','${ids.staff}','authenticated','authenticated','staff-${ids.staff}@test.invalid','{}','{}',now(),now());
  INSERT INTO marketplace.saved_searches(user_id,title,query_params) VALUES('${ids.owner}','Legacy search','{"legacy":true}'::jsonb);
  ${role("anon")}
  DO $$ BEGIN BEGIN PERFORM * FROM marketplace.list_own_saved_searches(); INSERT INTO results VALUES('anon RPC denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES('anon RPC denied',true); END; END $$;
  ${role("authenticated", ids.owner)}
  INSERT INTO results VALUES('legacy row readable',(SELECT count(*) = 1 AND bool_and(criteria_version IS NULL AND legacy_query_params = '{"legacy":true}'::jsonb) FROM marketplace.list_own_saved_searches()));
  DO $$ BEGIN BEGIN PERFORM * FROM marketplace.create_saved_search(${invalidRequest},'Invalid',false); INSERT INTO results VALUES('unsupported v1 denied',false); EXCEPTION WHEN SQLSTATE 'OT422' THEN INSERT INTO results VALUES('unsupported v1 denied',true); END; END $$;
  DO $$ BEGIN BEGIN PERFORM * FROM marketplace.create_saved_search(${malformedRequest},'Malformed',false); INSERT INTO results VALUES('malformed v1 denied',false); EXCEPTION WHEN SQLSTATE 'OT422' THEN INSERT INTO results VALUES('malformed v1 denied',true); END; END $$;
  SELECT * INTO TEMP TABLE owner_saved FROM marketplace.create_saved_search(${validRequest},'Canonical',true);
  INSERT INTO results VALUES('valid v1 stored canonically',(SELECT criteria_version = 'v1' AND search_request ? 'version' AND alert_enabled FROM owner_saved));
  DO $$ BEGIN BEGIN INSERT INTO marketplace.saved_searches(user_id,title,query_params) VALUES('${ids.owner}','Direct','{}'::jsonb); INSERT INTO results VALUES('direct table DML denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES('direct table DML denied',true); END; END $$;
  SELECT count(*) FROM marketplace.create_saved_search(${validRequest},'Two',false);
  SELECT count(*) FROM marketplace.create_saved_search(${validRequest},'Three',false);
  SELECT count(*) FROM marketplace.create_saved_search(${validRequest},'Four',false);
  INSERT INTO results VALUES('owner has five maximum',(SELECT count(*) = 5 FROM marketplace.list_own_saved_searches()));
  DO $$ BEGIN BEGIN PERFORM * FROM marketplace.create_saved_search(${validRequest},'Six',false); INSERT INTO results VALUES('max five enforced',false); EXCEPTION WHEN SQLSTATE 'OT429' THEN INSERT INTO results VALUES('max five enforced',true); END; END $$;
  SELECT * INTO TEMP TABLE updated_saved FROM marketplace.update_own_saved_search_metadata((SELECT saved_search_id FROM owner_saved),'Renamed',false);
  INSERT INTO results VALUES('owner metadata update',(SELECT title = 'Renamed' AND NOT alert_enabled FROM updated_saved));
  ${role("authenticated", ids.other)}
  INSERT INTO results VALUES('cross user list isolated',(SELECT count(*) = 0 FROM marketplace.list_own_saved_searches()));
  DO $$ BEGIN BEGIN PERFORM * FROM marketplace.update_own_saved_search_metadata((SELECT saved_search_id FROM owner_saved),'Hijack',true); INSERT INTO results VALUES('cross user update denied',false); EXCEPTION WHEN SQLSTATE 'OT404' THEN INSERT INTO results VALUES('cross user update denied',true); END; END $$;
  DO $$ BEGIN BEGIN PERFORM marketplace.delete_own_saved_search((SELECT saved_search_id FROM owner_saved)); INSERT INTO results VALUES('cross user delete denied',false); EXCEPTION WHEN SQLSTATE 'OT404' THEN INSERT INTO results VALUES('cross user delete denied',true); END; END $$;
  ${role("authenticated", ids.staff)}
  INSERT INTO results VALUES('staff has no owner bypass',(SELECT count(*) = 0 FROM marketplace.list_own_saved_searches()));
  DO $$ BEGIN BEGIN SELECT * FROM marketplace.saved_searches; INSERT INTO results VALUES('staff direct read denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES('staff direct read denied',true); END; END $$;
  ${role("authenticated", ids.owner)}
  SELECT marketplace.delete_own_saved_search((SELECT saved_search_id FROM owner_saved));
  SELECT count(*) FROM marketplace.create_saved_search(${validRequest},'Replacement',false);
  INSERT INTO results VALUES('delete frees capacity',(SELECT count(*) = 5 FROM marketplace.list_own_saved_searches()));
  RESET ROLE;
  SELECT name,ok FROM results ORDER BY name;
  ROLLBACK;`;

const rows = query(sql).split(/\r?\n/).filter((line) => line.split("|").length === 2).map((line) => line.split("|"));
assert.deepEqual(rows.filter(([, ok]) => ok !== "t"), [], JSON.stringify(rows));
console.log(`FUNCTIONAL-03B-A1 saved-search security matrix passed (${rows.length} checks)`);
