const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261013140000_jlc0918_dealer_cross_channel_analytics.sql"), "utf8");
const dashboard = fs.readFileSync(path.join(root, "apps", "web", "src", "app", "profile", "dealer-analytics", "_components", "DealerCrossChannelAnalyticsClient.tsx"), "utf8");
for (const token of ["list_own_dealer_cross_channel_analytics", "'listing'", "'post'", "'live'", "'lead'", "source:", "funnel:", "GRANT EXECUTE ON FUNCTION public.list_own_dealer_cross_channel_analytics() TO authenticated"]) assert.ok(migration.includes(token), `missing ${token}`);
assert.doesNotMatch(migration, /^(?:DROP\s+(?:TABLE|SCHEMA|DATABASE)|TRUNCATE)\b/im);
assert.match(dashboard, /supabase\.rpc\("list_own_dealer_cross_channel_analytics"\)/);
assert.match(dashboard, /sm:grid-cols-2 lg:grid-cols-4/);

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["dealer", "staff", "outsider", "make", "model", "vehicle", "listing", "post", "stream", "interest", "lead"].map((key) => [key, randomUUID()]));
const role = (sub) => `RESET ROLE; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '{"role":"authenticated","sub":"${sub}"}';`;
const sql = `BEGIN;
CREATE TEMP TABLE results (name TEXT PRIMARY KEY, ok BOOLEAN NOT NULL) ON COMMIT DROP;
GRANT SELECT, INSERT ON results TO authenticated, anon;
INSERT INTO auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
 ('00000000-0000-0000-0000-000000000000','${ids.dealer}','authenticated','authenticated','dealer-${ids.dealer}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.staff}','authenticated','authenticated','staff-${ids.staff}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.outsider}','authenticated','authenticated','outsider-${ids.outsider}@test.invalid','{}','{}',now(),now());
UPDATE public.profiles SET seller_type='dealer' WHERE id='${ids.dealer}';
INSERT INTO marketplace.dealer_staff_memberships(dealer_id,user_id,role) VALUES ('${ids.dealer}','${ids.staff}','staff');
INSERT INTO vehicle.makes(id,name,slug) VALUES ('${ids.make}','JLC 0918 Make','jlc-0918-${ids.make}');
INSERT INTO vehicle.models(id,make_id,name,slug) VALUES ('${ids.model}','${ids.make}','JLC 0918 Model','jlc-0918-${ids.model}');
INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by) VALUES ('${ids.vehicle}','${ids.make}','${ids.model}',2024,1,'gasoline','automatic','manual','active','${ids.dealer}');
INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES ('${ids.vehicle}','${ids.dealer}','owner',true);
INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type) VALUES ('${ids.listing}','${ids.vehicle}','${ids.dealer}','active','active','JLC 0918 fixture',1,'KZT',false,'Almaty','dealer');
INSERT INTO marketplace.seller_analytics_events(listing_id,event_type,event_key) VALUES ('${ids.listing}','view','${randomUUID()}'),('${ids.listing}','favorite','${randomUUID()}');
INSERT INTO marketplace.dealer_posts(id,dealer_id,body) VALUES ('${ids.post}','${ids.dealer}','JLC 0918 post');
INSERT INTO marketplace.dealer_live_streams(id,dealer_id,title,status,started_at,ended_at) VALUES ('${ids.stream}','${ids.dealer}','JLC 0918 live','ended',now()-interval '1 hour',now());
INSERT INTO marketplace.dealer_live_interests(id,stream_id,viewer_id) VALUES ('${ids.interest}','${ids.stream}','${ids.staff}');
INSERT INTO marketplace.dealer_leads(id,dealer_id,source,source_record_id,status) VALUES ('${ids.lead}','${ids.dealer}','dealer_live','${ids.interest}','meeting');
${role(ids.dealer)}
INSERT INTO results VALUES ('owner sees aggregate channel metrics and CRM source attribution', (SELECT count(*) = 9 FROM public.list_own_dealer_cross_channel_analytics() WHERE dealer_id='${ids.dealer}') AND (SELECT event_count=1 FROM public.list_own_dealer_cross_channel_analytics() WHERE dealer_id='${ids.dealer}' AND channel='listing' AND metric='view') AND (SELECT event_count=1 FROM public.list_own_dealer_cross_channel_analytics() WHERE dealer_id='${ids.dealer}' AND channel='live' AND metric='interests') AND (SELECT event_count=1 FROM public.list_own_dealer_cross_channel_analytics() WHERE dealer_id='${ids.dealer}' AND channel='lead' AND metric='source:dealer_live'));
${role(ids.staff)}
INSERT INTO results VALUES ('staff sees own dealer aggregate metrics', (SELECT count(*) = 9 FROM public.list_own_dealer_cross_channel_analytics() WHERE dealer_id='${ids.dealer}'));
${role(ids.outsider)}
INSERT INTO results VALUES ('outsider sees no dealer analytics', (SELECT count(*)=0 FROM public.list_own_dealer_cross_channel_analytics()));
RESET ROLE; SET LOCAL ROLE anon; SET LOCAL request.jwt.claims TO '{"role":"anon"}';
DO $$ BEGIN BEGIN PERFORM public.list_own_dealer_cross_channel_analytics(); INSERT INTO results VALUES ('anonymous execute denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES ('anonymous execute denied',true); END; END $$;
RESET ROLE; SELECT name,ok FROM results ORDER BY name; ROLLBACK;`;
const rows = query(sql).split(/\r?\n/).filter((line) => line.split("|").length === 2).map((line) => line.split("|"));
assert.deepEqual(rows.filter(([, ok]) => ok !== "t"), [], JSON.stringify(rows));
console.log(`JLC-0918 cross-channel analytics/security matrix passed (${rows.length} checks)`);
