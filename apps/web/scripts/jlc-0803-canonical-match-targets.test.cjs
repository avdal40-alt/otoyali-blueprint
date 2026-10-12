const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261012190000_jlc0803_canonical_match_targets.sql"), "utf8");
for (const token of [
  "CREATE FUNCTION marketplace.list_listing_match_targets_v1",
  "marketplace.buyer_requests", "marketplace.saved_searches",
  "marketplace.listing_matches_search_v1", "SECURITY DEFINER", "SET search_path = ''"
]) assert.ok(migration.includes(token), token);
assert.doesNotMatch(migration, /marketplace\.notifications/, "JLC-0803 must not create notification side effects");

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["seller", "buyer", "other", "make", "otherMake", "model", "otherModel", "vehicle", "listing", "buyerMatch", "buyerArchived", "buyerCatalogMiss", "buyerMalformed", "savedMatch", "savedDisabled", "savedOwn", "savedCatalogMiss", "savedMalformed"].map((key) => [key, randomUUID()]));
const requestFor = (modelId) => JSON.stringify({ version: "v1", filters: { model_ids: [modelId] } }).replaceAll("'", "''");
const matchingRequest = requestFor(ids.model);
const catalogMissRequest = requestFor(ids.otherModel);
const malformedRequest = '{"version":"v2","filters":{}}';
const role = (name, sub) => `RESET ROLE; SET LOCAL ROLE ${name}; SET LOCAL request.jwt.claims TO '${JSON.stringify({ role: name, ...(sub ? { sub } : {}) }).replaceAll("'", "''")}';`;

const sql = `BEGIN;
CREATE TEMP TABLE results (name TEXT PRIMARY KEY, ok BOOLEAN NOT NULL) ON COMMIT DROP;
GRANT SELECT, INSERT ON results TO anon, authenticated;
INSERT INTO auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
 ('00000000-0000-0000-0000-000000000000','${ids.seller}','authenticated','authenticated','seller-${ids.seller}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.buyer}','authenticated','authenticated','buyer-${ids.buyer}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.other}','authenticated','authenticated','other-${ids.other}@test.invalid','{}','{}',now(),now());
INSERT INTO vehicle.makes(id,name,slug) VALUES
 ('${ids.make}','JLC 0803 make','jlc-0803-${ids.make}'),
 ('${ids.otherMake}','JLC 0803 other make','jlc-0803-other-${ids.otherMake}');
INSERT INTO vehicle.models(id,make_id,name,slug) VALUES
 ('${ids.model}','${ids.make}','JLC 0803 model','jlc-0803-${ids.model}'),
 ('${ids.otherModel}','${ids.otherMake}','JLC 0803 other model','jlc-0803-other-${ids.otherModel}');
INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by)
 VALUES ('${ids.vehicle}','${ids.make}','${ids.model}',2024,100,'gasoline','automatic','manual','active','${ids.seller}');
INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES ('${ids.vehicle}','${ids.seller}','owner',true);
INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type)
 VALUES ('${ids.listing}','${ids.vehicle}','${ids.seller}','active','active','JLC 0803 fixture',100000,'KZT',false,'Astana','private');
INSERT INTO marketplace.buyer_requests(id,user_id,title,criteria_version,search_request,status,created_at) VALUES
 ('${ids.buyerMatch}','${ids.buyer}','matching buyer','v1','${matchingRequest}'::jsonb,'active','2026-01-01T00:00:00Z'),
 ('${ids.buyerArchived}','${ids.buyer}','archived buyer','v1','${matchingRequest}'::jsonb,'archived','2026-01-01T00:01:00Z'),
 ('${ids.buyerCatalogMiss}','${ids.buyer}','other catalog','v1','${catalogMissRequest}'::jsonb,'active','2026-01-01T00:02:00Z'),
 ('${ids.buyerMalformed}','${ids.buyer}','malformed','v1','${malformedRequest}'::jsonb,'active','2026-01-01T00:03:00Z');
INSERT INTO marketplace.saved_searches(id,user_id,title,query_params,criteria_version,search_request,alert_enabled,created_at) VALUES
 ('${ids.savedMatch}','${ids.other}','matching saved','{}','v1','${matchingRequest}'::jsonb,true,'2026-01-02T00:00:00Z'),
 ('${ids.savedDisabled}','${ids.other}','disabled saved','{}','v1','${matchingRequest}'::jsonb,false,'2026-01-02T00:01:00Z'),
 ('${ids.savedOwn}','${ids.seller}','own saved','{}','v1','${matchingRequest}'::jsonb,true,'2026-01-02T00:02:00Z'),
 ('${ids.savedCatalogMiss}','${ids.other}','other catalog','{}','v1','${catalogMissRequest}'::jsonb,true,'2026-01-02T00:03:00Z'),
 ('${ids.savedMalformed}','${ids.other}','malformed','{}','v1','${malformedRequest}'::jsonb,true,'2026-01-02T00:04:00Z');
CREATE TEMP TABLE first_pass AS SELECT * FROM marketplace.list_listing_match_targets_v1('${ids.listing}');
CREATE TEMP TABLE second_pass AS SELECT * FROM marketplace.list_listing_match_targets_v1('${ids.listing}');
INSERT INTO results VALUES ('only active canonical non-self matches are returned', (SELECT count(*) = 2 FROM first_pass));
INSERT INTO results VALUES ('buyer and saved targets retain their canonical kinds', (SELECT array_agg(target_kind ORDER BY target_kind) = ARRAY['buyer_request','saved_search'] FROM first_pass));
INSERT INTO results VALUES ('catalog boundaries reject another make/model', NOT EXISTS (SELECT 1 FROM first_pass WHERE target_id IN ('${ids.buyerCatalogMiss}','${ids.savedCatalogMiss}')));
INSERT INTO results VALUES ('output is deterministic', (SELECT jsonb_agg(to_jsonb(first_pass) ORDER BY target_kind,target_id) FROM first_pass) = (SELECT jsonb_agg(to_jsonb(second_pass) ORDER BY target_kind,target_id) FROM second_pass));
INSERT INTO results VALUES ('absent or ineligible projection returns no matches', (SELECT count(*) = 0 FROM marketplace.list_listing_match_targets_v1('${randomUUID()}')));
EXPLAIN (ANALYZE, FORMAT JSON) SELECT * FROM marketplace.list_listing_match_targets_v1('${ids.listing}');
${role("anon")}
DO $$ BEGIN BEGIN PERFORM * FROM marketplace.list_listing_match_targets_v1('${ids.listing}'); INSERT INTO results VALUES ('anon matcher denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES ('anon matcher denied',true); END; END $$;
${role("authenticated", ids.buyer)}
DO $$ BEGIN BEGIN PERFORM * FROM marketplace.list_listing_match_targets_v1('${ids.listing}'); INSERT INTO results VALUES ('authenticated matcher denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES ('authenticated matcher denied',true); END; END $$;
RESET ROLE;
SELECT name,ok FROM results ORDER BY name;
ROLLBACK;`;

const rows = query(sql).split(/\r?\n/).filter((line) => line.split("|").length === 2).map((line) => line.split("|"));
assert.deepEqual(rows.filter(([, ok]) => ok !== "t"), [], JSON.stringify(rows));
const privileges = query("SELECT has_function_privilege('anon','marketplace.list_listing_match_targets_v1(uuid)'::regprocedure,'EXECUTE'), has_function_privilege('authenticated','marketplace.list_listing_match_targets_v1(uuid)'::regprocedure,'EXECUTE'), has_function_privilege('service_role','marketplace.list_listing_match_targets_v1(uuid)'::regprocedure,'EXECUTE'), (SELECT prosecdef FROM pg_proc WHERE oid='marketplace.list_listing_match_targets_v1(uuid)'::regprocedure);").split("|");
assert.deepEqual(privileges, ["f", "f", "t", "t"]);
console.log(`JLC-0803 canonical buyer-request and saved-search matcher passed (${rows.length} checks)`);
