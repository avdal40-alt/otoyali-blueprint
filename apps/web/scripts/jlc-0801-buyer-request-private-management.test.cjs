const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261011180000_jlc0801_buyer_request_private_management.sql"), "utf8");
for (const token of ["CREATE TABLE marketplace.buyer_requests", "ENABLE ROW LEVEL SECURITY", "buyer_requests_owner_only", "marketplace.search_listings_v1(v_request)", "REVOKE ALL ON TABLE marketplace.buyer_requests", "archive_own_buyer_request", "SET search_path = ''"]) assert.ok(migration.includes(token), token);
for (const file of ["src/app/api/buyer-requests/route.ts", "src/app/api/buyer-requests/[id]/route.ts"]) {
  const source = fs.readFileSync(path.join(root, "apps", "web", file), "utf8");
  assert.ok(source.includes('requireAuthenticatedRequest'), `${file} authentication`);
  assert.ok(source.includes('buyerRequestResponseHeaders'), `${file} private cache headers`);
}

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["owner", "other"].map((name) => [name, randomUUID()]));
const claims = (role, sub) => JSON.stringify({ role, ...(sub ? { sub } : {}) }).replaceAll("'", "''");
const role = (name, sub) => `RESET ROLE; SET LOCAL ROLE ${name}; SET LOCAL request.jwt.claims TO '${claims(name, sub)}';`;
const validRequest = `'${JSON.stringify({ version: "v1", filters: { q: "Camry" }, sort: "newest", limit: 24 }).replaceAll("'", "''")}'::jsonb`;
const invalidRequest = `'${JSON.stringify({ version: "v2", filters: {} }).replaceAll("'", "''")}'::jsonb`;
const sql = `BEGIN;
  CREATE TEMP TABLE results (name text primary key, ok boolean not null) ON COMMIT DROP;
  GRANT SELECT, INSERT ON results TO anon, authenticated;
  INSERT INTO auth.users (instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
    ('00000000-0000-0000-0000-000000000000','${ids.owner}','authenticated','authenticated','owner-${ids.owner}@test.invalid','{}','{}',now(),now()),
    ('00000000-0000-0000-0000-000000000000','${ids.other}','authenticated','authenticated','other-${ids.other}@test.invalid','{}','{}',now(),now());
  ${role("anon")}
  DO $$ BEGIN BEGIN PERFORM * FROM marketplace.list_own_buyer_requests(false); INSERT INTO results VALUES('anon RPC denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES('anon RPC denied',true); END; END $$;
  DO $$ BEGIN BEGIN PERFORM * FROM marketplace.buyer_requests; INSERT INTO results VALUES('anon direct read denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES('anon direct read denied',true); END; END $$;
  ${role("authenticated", ids.owner)}
  DO $$ BEGIN BEGIN PERFORM * FROM marketplace.create_own_buyer_request(${invalidRequest},'Invalid'); INSERT INTO results VALUES('invalid criteria denied',false); EXCEPTION WHEN SQLSTATE 'OT422' THEN INSERT INTO results VALUES('invalid criteria denied',true); END; END $$;
  SELECT * INTO TEMP TABLE owned FROM marketplace.create_own_buyer_request(${validRequest},'Private request');
  INSERT INTO results VALUES('canonical criteria stored',(SELECT criteria_version = 'v1' AND search_request ? 'version' AND status = 'active' FROM owned));
  DO $$ BEGIN BEGIN INSERT INTO marketplace.buyer_requests(user_id,search_request) VALUES('${ids.owner}','{}'::jsonb); INSERT INTO results VALUES('direct table DML denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES('direct table DML denied',true); END; END $$;
  INSERT INTO results VALUES('owner can list',(SELECT count(*) = 1 FROM marketplace.list_own_buyer_requests(false)));
  SELECT * INTO TEMP TABLE edited FROM marketplace.update_own_buyer_request((SELECT buyer_request_id FROM owned),${validRequest},'Edited request');
  INSERT INTO results VALUES('owner can edit',(SELECT title = 'Edited request' FROM edited));
  ${role("authenticated", ids.other)}
  INSERT INTO results VALUES('other list isolated',(SELECT count(*) = 0 FROM marketplace.list_own_buyer_requests(true)));
  DO $$ BEGIN BEGIN PERFORM * FROM marketplace.update_own_buyer_request((SELECT buyer_request_id FROM owned),${validRequest},'Hijack'); INSERT INTO results VALUES('other edit denied',false); EXCEPTION WHEN SQLSTATE 'OT404' THEN INSERT INTO results VALUES('other edit denied',true); END; END $$;
  DO $$ BEGIN BEGIN PERFORM marketplace.archive_own_buyer_request((SELECT buyer_request_id FROM owned)); INSERT INTO results VALUES('other archive denied',false); EXCEPTION WHEN SQLSTATE 'OT404' THEN INSERT INTO results VALUES('other archive denied',true); END; END $$;
  ${role("authenticated", ids.owner)}
  SELECT marketplace.archive_own_buyer_request((SELECT buyer_request_id FROM owned));
  INSERT INTO results VALUES('archive hides active request',(SELECT count(*) = 0 FROM marketplace.list_own_buyer_requests(false)));
  INSERT INTO results VALUES('owner can include archived',(SELECT count(*) = 1 AND bool_and(status = 'archived') FROM marketplace.list_own_buyer_requests(true)));
  RESET ROLE;
  SELECT name,ok FROM results ORDER BY name;
  ROLLBACK;`;
const rows = query(sql).split(/\r?\n/).filter((line) => line.split("|").length === 2).map((line) => line.split("|"));
assert.deepEqual(rows.filter(([, ok]) => ok !== "t"), [], JSON.stringify(rows));
console.log(`JLC-0801 buyer request privacy matrix passed (${rows.length} checks)`);
