const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20260922113929_functional_03b_b_notification_data_saved_search_alerts.sql"), "utf8");
for (const token of [
  "CREATE TABLE marketplace.notifications", "type TEXT NOT NULL CHECK (type = 'saved_search_match')",
  "notifications_saved_search_match_dedup_idx", "marketplace.listing_matches_search_v1(",
  "CREATE FUNCTION marketplace.generate_saved_search_alerts_for_listing", "marketplace.sync_listing_search_document_lifecycle",
  "CREATE FUNCTION marketplace.list_own_notifications", "CREATE FUNCTION marketplace.count_own_unread_notifications",
  "CREATE FUNCTION marketplace.mark_own_notification_read", "CREATE FUNCTION marketplace.mark_all_own_notifications_read"
]) assert.ok(migration.includes(token), token);
assert.doesNotMatch(migration, /search_listings_v1\(/, "alert generation must not call paginated Search v1");
assert.match(migration, /CREATE TABLE marketplace\.notifications \([\s\S]*?listing_id UUID[\s\S]*?\);/);

for (const route of [
  "src/app/api/notifications/route.ts", "src/app/api/notifications/unread-count/route.ts",
  "src/app/api/notifications/[id]/read/route.ts", "src/app/api/notifications/read-all/route.ts"
]) {
  const source = fs.readFileSync(path.join(root, "apps", "web", route), "utf8");
  assert.match(source, /requireAuthenticatedRequest/);
  assert.match(source, /privateResponseHeaders/);
  assert.doesNotMatch(source, /userId|user_id/);
}

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["watcher", "disabled", "seller", "other", "staff", "make", "model", "vehicle", "saved", "disabledSaved", "legacy", "malformed"].map((name) => [name, randomUUID()]));
const listingIds = Array.from({ length: 65 }, () => randomUUID());
const outsideId = [...listingIds].sort()[64];
const request = JSON.stringify({ version: "v1", limit: 60, sort: "price_asc", filters: { q: "B3 Alert" } }).replaceAll("'", "''");
const nonMatchRequest = JSON.stringify({ version: "v1", filters: { q: "not-the-alert" } }).replaceAll("'", "''");
const claims = (role, sub) => JSON.stringify({ role, ...(sub ? { sub } : {}) }).replaceAll("'", "''");
const asRole = (role, sub) => `RESET ROLE; SET LOCAL ROLE ${role}; SET LOCAL request.jwt.claims TO '${claims(role, sub)}';`;
const fixtures = listingIds.map((id, index) => `('${id}','${ids.vehicle}','${ids.seller}','active','active','B3 Alert fixture ${index}',100000,'TRY',false,'Istanbul','private')`).join(",");

const sql = `BEGIN;
CREATE TEMP TABLE results (name TEXT PRIMARY KEY, ok BOOLEAN NOT NULL) ON COMMIT DROP;
GRANT SELECT, INSERT ON results TO anon, authenticated, service_role;
INSERT INTO auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
 ('00000000-0000-0000-0000-000000000000','${ids.watcher}','authenticated','authenticated','watcher-${ids.watcher}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.disabled}','authenticated','authenticated','disabled-${ids.disabled}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.seller}','authenticated','authenticated','seller-${ids.seller}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.other}','authenticated','authenticated','other-${ids.other}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.staff}','authenticated','authenticated','staff-${ids.staff}@test.invalid','{}','{}',now(),now());
INSERT INTO vehicle.makes(id,name,slug) VALUES ('${ids.make}','B3 Alert Make','b3-alert-${ids.make}');
INSERT INTO vehicle.models(id,make_id,name,slug) VALUES ('${ids.model}','${ids.make}','B3 Alert Model','b3-alert-${ids.model}');
INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by) VALUES ('${ids.vehicle}','${ids.make}','${ids.model}',2024,100,'gasoline','automatic','manual','active','${ids.seller}');
INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES ('${ids.vehicle}','${ids.seller}','owner',true);
INSERT INTO marketplace.saved_searches(id,user_id,title,query_params,criteria_version,search_request,alert_enabled) VALUES
 ('${ids.saved}','${ids.watcher}','Enabled','{}','v1','${request}'::jsonb,true),
 ('${ids.disabledSaved}','${ids.disabled}','Disabled','{}','v1','${request}'::jsonb,false),
 ('${ids.legacy}','${ids.other}','Legacy','{"legacy":true}',NULL,NULL,true),
 ('${ids.malformed}','${ids.other}','Malformed','{}','v1','{"version":"v2","filters":{}}',true),
 ('${randomUUID()}','${ids.seller}','Own listing','{}','v1','${request}'::jsonb,true),
 ('${randomUUID()}','${ids.other}','Nonmatch','{}','v1','${nonMatchRequest}'::jsonb,true);
INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type) VALUES ${fixtures};
INSERT INTO results VALUES ('lifecycle generated one durable notification per matching listing', (SELECT count(*) = 65 FROM marketplace.notifications WHERE saved_search_id = '${ids.saved}'));
INSERT INTO results VALUES ('disabled legacy malformed and own seller searches generate none', (SELECT count(*) = 65 FROM marketplace.notifications));
INSERT INTO results VALUES ('outside public first page still matches', marketplace.listing_matches_search_v1('${request}'::jsonb, '${outsideId}'));
SET LOCAL ROLE service_role;
INSERT INTO results VALUES ('system generator is executable and deduplicated', marketplace.generate_saved_search_alerts_for_listing('${outsideId}') = 0);
RESET ROLE;
INSERT INTO results VALUES ('absent listing safely returns zero', marketplace.generate_saved_search_alerts_for_listing('${randomUUID()}') = 0);
${asRole("anon")}
DO $$ BEGIN BEGIN PERFORM * FROM marketplace.list_own_notifications(); INSERT INTO results VALUES ('anon list denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES ('anon list denied',true); END; END $$;
DO $$ BEGIN BEGIN PERFORM marketplace.count_own_unread_notifications(); INSERT INTO results VALUES ('anon unread denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES ('anon unread denied',true); END; END $$;
DO $$ BEGIN BEGIN PERFORM marketplace.mark_own_notification_read('${randomUUID()}'); INSERT INTO results VALUES ('anon mark denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES ('anon mark denied',true); END; END $$;
DO $$ BEGIN BEGIN PERFORM marketplace.mark_all_own_notifications_read(); INSERT INTO results VALUES ('anon mark all denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES ('anon mark all denied',true); END; END $$;
DO $$ BEGIN BEGIN PERFORM marketplace.generate_saved_search_alerts_for_listing('${outsideId}'); INSERT INTO results VALUES ('anon generator denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES ('anon generator denied',true); END; END $$;
DO $$ BEGIN BEGIN INSERT INTO marketplace.notifications(user_id,type,saved_search_id,listing_id) VALUES ('${ids.watcher}','saved_search_match','${ids.saved}','${outsideId}'); INSERT INTO results VALUES ('anon direct insert denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES ('anon direct insert denied',true); END; END $$;
${asRole("authenticated", ids.watcher)}
CREATE TEMP TABLE page_one AS SELECT * FROM marketplace.list_own_notifications(50,NULL,NULL);
CREATE TEMP TABLE page_two AS SELECT * FROM marketplace.list_own_notifications(50,(SELECT created_at FROM page_one ORDER BY created_at,notification_id LIMIT 1),(SELECT notification_id FROM page_one ORDER BY created_at,notification_id LIMIT 1));
INSERT INTO results VALUES ('owner pagination is bounded deterministic and disjoint', (SELECT count(*) = 50 FROM page_one) AND (SELECT count(*) = 15 FROM page_two) AND NOT EXISTS (SELECT 1 FROM page_one JOIN page_two USING(notification_id)));
INSERT INTO results VALUES ('owner unread count starts at 65', marketplace.count_own_unread_notifications() = 65);
DO $$ BEGIN BEGIN PERFORM * FROM marketplace.list_own_notifications(51,NULL,NULL); INSERT INTO results VALUES ('malformed notification cursor denied',false); EXCEPTION WHEN SQLSTATE 'OT422' THEN INSERT INTO results VALUES ('malformed notification cursor denied',true); END; END $$;
SELECT notification_id INTO TEMP TABLE watched_notification FROM page_one LIMIT 1;
INSERT INTO results VALUES ('owner mark read succeeds', marketplace.mark_own_notification_read((SELECT notification_id FROM watched_notification)));
INSERT INTO results VALUES ('owner mark read is idempotent', marketplace.mark_own_notification_read((SELECT notification_id FROM watched_notification)));
INSERT INTO results VALUES ('owner unread count decrements', marketplace.count_own_unread_notifications() = 64);
DO $$ BEGIN BEGIN INSERT INTO marketplace.notifications(user_id,type,saved_search_id,listing_id) VALUES ('${ids.watcher}','saved_search_match','${ids.saved}','${outsideId}'); INSERT INTO results VALUES ('authenticated direct insert denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES ('authenticated direct insert denied',true); END; END $$;
DO $$ BEGIN BEGIN PERFORM marketplace.generate_saved_search_alerts_for_listing('${outsideId}'); INSERT INTO results VALUES ('authenticated generator denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES ('authenticated generator denied',true); END; END $$;
INSERT INTO results VALUES ('owner mark all affects own unread only', marketplace.mark_all_own_notifications_read() = 64 AND marketplace.count_own_unread_notifications() = 0);
RESET ROLE;
UPDATE marketplace.saved_searches SET alert_enabled = false WHERE id = '${ids.saved}';
INSERT INTO results VALUES ('history remains after alerts disabled', (SELECT count(*) = 65 FROM marketplace.notifications WHERE saved_search_id = '${ids.saved}'));
${asRole("authenticated", ids.other)}
INSERT INTO results VALUES ('other user list is isolated', (SELECT count(*) = 0 FROM marketplace.list_own_notifications()));
INSERT INTO results VALUES ('other user cannot mark owner notification', NOT marketplace.mark_own_notification_read((SELECT notification_id FROM watched_notification)));
${asRole("authenticated", ids.staff)}
INSERT INTO results VALUES ('ordinary staff has no notification bypass', (SELECT count(*) = 0 FROM marketplace.list_own_notifications()) AND NOT marketplace.mark_own_notification_read((SELECT notification_id FROM watched_notification)));
RESET ROLE;
SELECT name,ok FROM results ORDER BY name;
ROLLBACK;`;

const rows = query(sql).split(/\r?\n/).filter((line) => line.split("|").length === 2).map((line) => line.split("|"));
assert.deepEqual(rows.filter(([, ok]) => ok !== "t"), [], JSON.stringify(rows));
console.log(`FUNCTIONAL-03B-B notification alert and private read contract passed (${rows.length} checks)`);
