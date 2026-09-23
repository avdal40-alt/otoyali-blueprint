const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..", "..", "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");
const migration = read("supabase", "migrations", "20260923130608_functional_03c_c_video_analytics.sql");
const route = read("apps", "web", "src", "app", "api", "analytics", "video", "route.ts");
const player = read("apps", "web", "src", "app", "video", "_components", "PublicVideoPlayer.tsx");

for (const event of ["video_impression", "video_play", "video_complete", "video_error"]) assert.match(migration, new RegExp(`'${event}'`));
for (const code of ["aborted", "network", "decode", "source_not_supported", "unknown"]) assert.match(migration, new RegExp(`'${code}'`));
assert.match(migration, /analytics_consent IS TRUE/);
assert.match(migration, /auth\.uid\(\)/);
assert.match(migration, /marketplace\.is_listing_video_publicly_eligible/);
assert.match(migration, /video\.listing_id = p_listing_id/);
assert.match(migration, /dedup_key UUID NOT NULL UNIQUE/);
assert.match(migration, /ON CONFLICT \(dedup_key\) DO NOTHING/);
assert.match(migration, /ENABLE ROW LEVEL SECURITY/);
assert.match(migration, /REVOKE ALL ON TABLE marketplace\.video_analytics_events FROM PUBLIC, anon, authenticated, service_role/);
assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.record_video_analytics_event[\s\S]* TO authenticated/);
assert.doesNotMatch(migration, /views_count\s*=|likes_count\s*=/);
assert.doesNotMatch(migration, /phone|vin|plate|seller_user_id|storage_path|signed|user_agent|ip_address|moderation_note|message/i);
assert.match(route, /requireAuthenticatedRequest/);
assert.match(route, /rateLimit\(authenticated\.userId, "analytics"\)/);
assert.match(route, /record_video_analytics_event/);
assert.match(route, /privateResponseHeaders/);
assert.doesNotMatch(route, /service_role|sellerUserId|storagePath|signedUrl|phone|vin|message/i);
assert.match(player, /IntersectionObserver/);
assert.match(player, /intersectionRatio >= 0\.5/);
assert.match(player, /onPlay=\{\(\) => void emit\("video_play"\)\}/);
assert.match(player, /onEnded=\{\(\) => void emit\("video_complete"\)\}/);
assert.match(player, /onError=\{\(\) =>/);
assert.match(player, /crypto\.randomUUID\(\)/);
assert.match(player, /emitted\.current\.has\(key\)/);
assert.match(player, /errorAttempt\.current \+= 1/);
assert.doesNotMatch(player, /autoplay|views_count|likes_count|listing-videos\//i);
assert.doesNotMatch(player, /JSON\.stringify\(\{[^}]*\b(src|poster)\b/);

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["dealer", "allowed", "denied", "unset", "listing", "video", "make", "model", "vehicle", "dedup"].map((key) => [key, randomUUID()]));
const claims = (sub) => JSON.stringify({ role: "authenticated", sub }).replaceAll("'", "''");
const auth = (user) => `RESET ROLE; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '${claims(user)}';`;
const sql = `BEGIN;
CREATE TEMP TABLE results(name text primary key, ok boolean not null) ON COMMIT DROP; GRANT SELECT, INSERT ON results TO anon, authenticated, service_role;
INSERT INTO auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
('00000000-0000-0000-0000-000000000000','${ids.dealer}','authenticated','authenticated','analytics-dealer-${ids.dealer}@test.invalid','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','${ids.allowed}','authenticated','authenticated','analytics-allowed-${ids.allowed}@test.invalid','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','${ids.denied}','authenticated','authenticated','analytics-denied-${ids.denied}@test.invalid','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','${ids.unset}','authenticated','authenticated','analytics-unset-${ids.unset}@test.invalid','{}','{}',now(),now());
SET LOCAL ROLE service_role;
UPDATE public.profiles SET seller_type='dealer' WHERE id='${ids.dealer}';
UPDATE identity.user_settings SET analytics_consent=TRUE WHERE user_id='${ids.allowed}';
UPDATE identity.user_settings SET analytics_consent=FALSE WHERE user_id='${ids.denied}';
DELETE FROM identity.user_settings WHERE user_id='${ids.unset}';
INSERT INTO marketplace.galeri_verifications(dealer_id,status,reviewed_at,reviewed_by) VALUES ('${ids.dealer}','verified',now(),'${ids.dealer}');
INSERT INTO vehicle.makes(id,name,slug) VALUES ('${ids.make}','Analytics Make','analytics-make-${ids.make}');
INSERT INTO vehicle.models(id,make_id,name,slug) VALUES ('${ids.model}','${ids.make}','Analytics Model','analytics-model-${ids.model}');
INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by) VALUES ('${ids.vehicle}','${ids.make}','${ids.model}',2024,100,'gasoline','automatic','manual','active','${ids.dealer}');
INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES ('${ids.vehicle}','${ids.dealer}','owner',true);
INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type) VALUES ('${ids.listing}','${ids.vehicle}','${ids.dealer}','active','active','Analytics listing',100000,'TRY',false,'Istanbul','dealer');
INSERT INTO marketplace.listing_videos(id,listing_id,seller_user_id,title,video_url,original_video_url,storage_path,duration_seconds,status,visibility,processing_status,blur_status,moderation_status,is_current) VALUES ('${ids.video}','${ids.listing}','${ids.dealer}','analytics','analytics.mp4','analytics.mp4','analytics.mp4',10,'active','public','processed','not_started','approved',true);
INSERT INTO results VALUES ('direct event dml revoked', NOT has_table_privilege('authenticated','marketplace.video_analytics_events','SELECT,INSERT,UPDATE,DELETE'));
${auth(ids.allowed)}
INSERT INTO results VALUES ('impression accepted', public.record_video_analytics_event('video_impression','${ids.listing}','${ids.video}','video_feed','tr',NULL,'${ids.dedup}'));
INSERT INTO results VALUES ('duplicate ignored', NOT public.record_video_analytics_event('video_impression','${ids.listing}','${ids.video}','video_feed','tr',NULL,'${ids.dedup}'));
INSERT INTO results VALUES ('play accepted', public.record_video_analytics_event('video_play','${ids.listing}','${ids.video}','video_feed','en',NULL,'${randomUUID()}'));
INSERT INTO results VALUES ('complete accepted', public.record_video_analytics_event('video_complete','${ids.listing}','${ids.video}','video_feed','en',NULL,'${randomUUID()}'));
INSERT INTO results VALUES ('coarse error accepted', public.record_video_analytics_event('video_error','${ids.listing}','${ids.video}','video_feed','en','decode','${randomUUID()}'));
DO $$ BEGIN BEGIN PERFORM public.record_video_analytics_event('invalid','${ids.listing}','${ids.video}','video_feed','en',NULL,'${randomUUID()}'); INSERT INTO results VALUES ('invalid event denied',false); EXCEPTION WHEN SQLSTATE 'OT422' THEN INSERT INTO results VALUES ('invalid event denied',true); END; END $$;
DO $$ BEGIN BEGIN PERFORM public.record_video_analytics_event('video_play','${ids.listing}','${randomUUID()}','video_feed','en',NULL,'${randomUUID()}'); INSERT INTO results VALUES ('mismatched video denied',false); EXCEPTION WHEN SQLSTATE 'OT404' THEN INSERT INTO results VALUES ('mismatched video denied',true); END; END $$;
SET LOCAL ROLE service_role; UPDATE marketplace.listing_videos SET visibility='private' WHERE id='${ids.video}';
${auth(ids.allowed)}
DO $$ BEGIN BEGIN PERFORM public.record_video_analytics_event('video_play','${ids.listing}','${ids.video}','video_feed','en',NULL,'${randomUUID()}'); INSERT INTO results VALUES ('nonpublic video denied',false); EXCEPTION WHEN SQLSTATE 'OT404' THEN INSERT INTO results VALUES ('nonpublic video denied',true); END; END $$;
SET LOCAL ROLE service_role; UPDATE marketplace.listing_videos SET visibility='public' WHERE id='${ids.video}';
${auth(ids.denied)}
INSERT INTO results VALUES ('denied consent stores nothing', NOT public.record_video_analytics_event('video_play','${ids.listing}','${ids.video}','video_feed','en',NULL,'${randomUUID()}'));
${auth(ids.unset)}
INSERT INTO results VALUES ('missing consent fails closed', NOT public.record_video_analytics_event('video_play','${ids.listing}','${ids.video}','video_feed','en',NULL,'${randomUUID()}'));
RESET ROLE;
INSERT INTO results VALUES ('four events stored', (SELECT count(*)=4 FROM marketplace.video_analytics_events WHERE video_id='${ids.video}'));
INSERT INTO results VALUES ('no sensitive columns', NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='video_analytics_events' AND column_name IN ('phone','vin','plate','seller_user_id','storage_path','signed_url','token','moderation_note','message','raw_error')));
SELECT name,ok FROM results ORDER BY name; ROLLBACK;`;
const results = query(sql).split(/\r?\n/).filter((line) => line.split("|").length === 2).map((line) => line.split("|"));
assert.deepEqual(results.filter(([, ok]) => ok !== "t"), [], JSON.stringify(results));
console.log("FUNCTIONAL-03C-C consent-safe video analytics contract passed");
