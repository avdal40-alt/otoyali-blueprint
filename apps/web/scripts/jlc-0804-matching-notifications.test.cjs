const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261012200000_jlc0804_buyer_request_match_notifications.sql"), "utf8");
for (const token of [
  "notifications_buyer_request_match_refs_chk",
  "notifications_buyer_request_match_dedup_idx",
  "CREATE FUNCTION marketplace.generate_listing_match_notifications",
  "marketplace.list_listing_match_targets_v1",
  "SECURITY DEFINER",
  "SET search_path = ''"
]) assert.ok(migration.includes(token), token);
assert.match(migration, /generate_price_drop_alerts_for_listing/u, "latest lifecycle owner preserves price-drop alerts");
assert.match(migration, /raised_at/u, "latest lifecycle owner preserves raised-at projection refresh");

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["seller", "buyer", "savedOwner", "make", "model", "vehicle", "listing", "buyerRequest", "savedSearch"].map((key) => [key, randomUUID()]));
const request = JSON.stringify({ version: "v1", filters: { model_ids: [ids.model] } }).replaceAll("'", "''");
const role = (name, sub) => `RESET ROLE; SET LOCAL ROLE ${name}; SET LOCAL request.jwt.claims TO '${JSON.stringify({ role: name, ...(sub ? { sub } : {}) }).replaceAll("'", "''")}';`;

const sql = `BEGIN;
CREATE TEMP TABLE results (name TEXT PRIMARY KEY, ok BOOLEAN NOT NULL) ON COMMIT DROP;
GRANT SELECT, INSERT ON results TO anon, authenticated;
INSERT INTO auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
 ('00000000-0000-0000-0000-000000000000','${ids.seller}','authenticated','authenticated','seller-${ids.seller}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.buyer}','authenticated','authenticated','buyer-${ids.buyer}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.savedOwner}','authenticated','authenticated','saved-${ids.savedOwner}@test.invalid','{}','{}',now(),now());
INSERT INTO vehicle.makes(id,name,slug) VALUES ('${ids.make}','JLC 0804 Make','jlc-0804-${ids.make}');
INSERT INTO vehicle.models(id,make_id,name,slug) VALUES ('${ids.model}','${ids.make}','JLC 0804 Model','jlc-0804-${ids.model}');
INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by)
 VALUES ('${ids.vehicle}','${ids.make}','${ids.model}',2024,100,'gasoline','automatic','manual','active','${ids.seller}');
INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES ('${ids.vehicle}','${ids.seller}','owner',true);
INSERT INTO marketplace.buyer_requests(id,user_id,title,criteria_version,search_request,status) VALUES ('${ids.buyerRequest}','${ids.buyer}','matching buyer request','v1','${request}'::jsonb,'active');
INSERT INTO marketplace.saved_searches(id,user_id,title,query_params,criteria_version,search_request,alert_enabled) VALUES ('${ids.savedSearch}','${ids.savedOwner}','matching saved search','{}','v1','${request}'::jsonb,true);
INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type)
 VALUES ('${ids.listing}','${ids.vehicle}','${ids.seller}','draft','draft','JLC 0804 fixture',100000,'KZT',false,'Astana','private');
UPDATE marketplace.listings SET status = 'active', moderation_status = 'active' WHERE id = '${ids.listing}';
INSERT INTO results VALUES ('activation creates buyer-request notification', (SELECT count(*) = 1 FROM marketplace.notifications WHERE type = 'buyer_request_match' AND user_id = '${ids.buyer}' AND buyer_request_id = '${ids.buyerRequest}' AND listing_id = '${ids.listing}'));
INSERT INTO results VALUES ('activation preserves saved-search notification', (SELECT count(*) = 1 FROM marketplace.notifications WHERE type = 'saved_search_match' AND user_id = '${ids.savedOwner}' AND saved_search_id = '${ids.savedSearch}' AND listing_id = '${ids.listing}'));
INSERT INTO results VALUES ('repeat producer inserts no duplicates', marketplace.generate_listing_match_notifications('${ids.listing}') = 0 AND marketplace.generate_listing_match_notifications('${ids.listing}') = 0);
${role("authenticated", ids.buyer)}
INSERT INTO results VALUES ('buyer reads own match through private facade', (SELECT count(*) = 1 FROM marketplace.list_own_notifications_v2(20,NULL,NULL) WHERE notification_type = 'buyer_request_match' AND listing_id = '${ids.listing}'));
${role("authenticated", ids.savedOwner)}
INSERT INTO results VALUES ('saved-search owner cannot read buyer match', (SELECT count(*) = 0 FROM marketplace.list_own_notifications_v2(20,NULL,NULL) WHERE notification_type = 'buyer_request_match'));
${role("anon")}
DO $$ BEGIN BEGIN PERFORM marketplace.generate_listing_match_notifications('${ids.listing}'); INSERT INTO results VALUES ('anon producer denied', false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES ('anon producer denied', true); END; END $$;
${role("authenticated", ids.buyer)}
DO $$ BEGIN BEGIN PERFORM marketplace.generate_listing_match_notifications('${ids.listing}'); INSERT INTO results VALUES ('authenticated producer denied', false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES ('authenticated producer denied', true); END; END $$;
RESET ROLE;
INSERT INTO results VALUES ('notification table remains private', NOT has_table_privilege('anon','marketplace.notifications','SELECT') AND NOT has_table_privilege('authenticated','marketplace.notifications','SELECT'));
INSERT INTO results VALUES ('producer is service-role-only', NOT has_function_privilege('anon','marketplace.generate_listing_match_notifications(uuid)'::regprocedure,'EXECUTE') AND NOT has_function_privilege('authenticated','marketplace.generate_listing_match_notifications(uuid)'::regprocedure,'EXECUTE') AND has_function_privilege('service_role','marketplace.generate_listing_match_notifications(uuid)'::regprocedure,'EXECUTE'));
SELECT name,ok FROM results ORDER BY name;
ROLLBACK;`;

const rows = query(sql).split(/\r?\n/).filter((line) => line.split("|").length === 2).map((line) => line.split("|"));
assert.deepEqual(rows.filter(([, ok]) => ok !== "t"), [], JSON.stringify(rows));
console.log(`JLC-0804 buyer-request matching notification matrix passed (${rows.length} checks)`);
