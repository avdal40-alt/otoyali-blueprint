const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261013134500_jlc0916_live_notifications_and_leads.sql"), "utf8");
for (const token of [
  "notifications_dealer_live_started_dedup_idx", "dealer_live_interests_viewer_once_per_stream_key",
  "CREATE FUNCTION marketplace.express_dealer_live_interest", "CREATE FUNCTION marketplace.list_own_notifications_v3",
  "source, source_record_id", "'dealer_live'", "ON CONFLICT (stream_id, viewer_id)", "SECURITY DEFINER"
]) assert.ok(migration.includes(token), `missing ${token}`);
assert.doesNotMatch(migration, /^(?:DROP\s+(?:TABLE|SCHEMA|DATABASE)|TRUNCATE)\b/im);

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["dealer", "follower", "viewer", "outsider", "phone", "make", "model", "vehicle", "listing", "stream"].map((key) => [key, randomUUID()]));
const claims = (role, sub) => JSON.stringify({ role, ...(sub ? { sub } : {}) }).replaceAll("'", "''");
const role = (name, sub) => `RESET ROLE; SET LOCAL ROLE ${name}; SET LOCAL request.jwt.claims TO '${claims(name, sub)}';`;
const sql = `BEGIN;
CREATE TEMP TABLE results (name TEXT PRIMARY KEY, ok BOOLEAN NOT NULL) ON COMMIT DROP;
GRANT SELECT, INSERT ON results TO anon, authenticated;
INSERT INTO auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
 ('00000000-0000-0000-0000-000000000000','${ids.dealer}','authenticated','authenticated','dealer-${ids.dealer}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.follower}','authenticated','authenticated','follower-${ids.follower}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.viewer}','authenticated','authenticated','viewer-${ids.viewer}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.outsider}','authenticated','authenticated','outsider-${ids.outsider}@test.invalid','{}','{}',now(),now());
UPDATE public.profiles SET seller_type='dealer' WHERE id='${ids.dealer}';
INSERT INTO identity.verified_seller_contact_phones(id,user_id,phone_e164,verified_at,verification_source,is_current_account_phone) VALUES ('${ids.phone}','${ids.dealer}','+7700${String(Date.now()).slice(-7)}',now(),'seller_otp',true);
INSERT INTO marketplace.dealer_verification_profiles(dealer_id,status,legal_entity_kind,business_registration_identifier,verified_phone_contact_id,dealer_trade_name,city,authorized_representative_name,reviewed_at,reviewed_by) VALUES ('${ids.dealer}','verified','legal_entity','123456789012','${ids.phone}','JLC 0916 dealer','Almaty','JLC representative',now(),'${ids.dealer}');
INSERT INTO marketplace.dealer_follows(dealer_id,follower_id) VALUES ('${ids.dealer}','${ids.follower}');
INSERT INTO vehicle.makes(id,name,slug) VALUES ('${ids.make}','JLC 0916 Make','jlc-0916-${ids.make}');
INSERT INTO vehicle.models(id,make_id,name,slug) VALUES ('${ids.model}','${ids.make}','JLC 0916 Model','jlc-0916-${ids.model}');
INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by) VALUES ('${ids.vehicle}','${ids.make}','${ids.model}',2024,1,'gasoline','automatic','manual','active','${ids.dealer}');
INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES ('${ids.vehicle}','${ids.dealer}','owner',true);
INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type) VALUES ('${ids.listing}','${ids.vehicle}','${ids.dealer}','active','active','JLC 0916 fixture',1,'KZT',false,'Almaty','dealer');
${role("authenticated", ids.dealer)}
SELECT marketplace.create_own_dealer_live_stream('JLC 0916 live') AS id INTO TEMP TABLE stream_id;
SELECT marketplace.attach_own_dealer_live_listings((SELECT id FROM stream_id), ARRAY['${ids.listing}'::uuid]);
SELECT marketplace.start_own_dealer_live_stream((SELECT id FROM stream_id));
RESET ROLE;
INSERT INTO results VALUES ('live start creates one follower notification',(SELECT count(*)=1 FROM marketplace.notifications WHERE user_id='${ids.follower}' AND type='dealer_live_started' AND live_stream_id=(SELECT id FROM stream_id)));
${role("authenticated", ids.follower)}
INSERT INTO results VALUES ('follower reads only own live notification',(SELECT count(*)=1 FROM marketplace.list_own_notifications_v3(20,NULL,NULL) WHERE notification_type='dealer_live_started' AND live_stream_id=(SELECT id FROM stream_id)));
${role("authenticated", ids.viewer)}
SELECT marketplace.express_dealer_live_interest((SELECT id FROM stream_id),'${ids.listing}') AS id INTO TEMP TABLE lead_id;
RESET ROLE;
INSERT INTO results VALUES ('live interest creates attributed CRM lead',(SELECT count(*)=1 FROM marketplace.dealer_leads WHERE id=(SELECT id FROM lead_id) AND dealer_id='${ids.dealer}' AND source='dealer_live' AND listing_id='${ids.listing}'));
${role("authenticated", ids.viewer)}
SELECT marketplace.express_dealer_live_interest((SELECT id FROM stream_id),'${ids.listing}') = (SELECT id FROM lead_id) AS same_lead INTO TEMP TABLE retry;
RESET ROLE;
INSERT INTO results VALUES ('repeat interest is idempotent',(SELECT same_lead FROM retry) AND (SELECT count(*)=1 FROM marketplace.dealer_live_interests WHERE stream_id=(SELECT id FROM stream_id) AND viewer_id='${ids.viewer}'));
${role("authenticated", ids.outsider)}
DO $$ BEGIN BEGIN PERFORM marketplace.express_dealer_live_interest((SELECT id FROM stream_id),'${randomUUID()}'); INSERT INTO results VALUES ('unattached listing interest denied',false); EXCEPTION WHEN SQLSTATE 'OT422' THEN INSERT INTO results VALUES ('unattached listing interest denied',true); END; END $$;
${role("anon")}
DO $$ BEGIN BEGIN PERFORM marketplace.express_dealer_live_interest((SELECT id FROM stream_id),NULL); INSERT INTO results VALUES ('anon interest denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES ('anon interest denied',true); END; END $$;
RESET ROLE;
INSERT INTO results VALUES ('interest and notifications tables remain private',NOT has_table_privilege('anon','marketplace.dealer_live_interests','SELECT') AND NOT has_table_privilege('authenticated','marketplace.dealer_live_interests','SELECT') AND NOT has_table_privilege('authenticated','marketplace.notifications','SELECT'));
SELECT name,ok FROM results ORDER BY name;
ROLLBACK;`;
const rows = query(sql).split(/\r?\n/).filter((line) => line.split("|").length === 2).map((line) => line.split("|"));
assert.deepEqual(rows.filter(([, ok]) => ok !== "t"), [], JSON.stringify(rows));
console.log(`JLC-0916 live notifications and CRM attribution matrix passed (${rows.length} checks)`);
