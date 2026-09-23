const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase/migrations/20260923110000_functional_03c_b1_video_upload_intent_contract.sql"), "utf8");
for (const token of [
  "CREATE TABLE marketplace.listing_video_upload_intents", "expires_at TIMESTAMPTZ NOT NULL", "consumed_at TIMESTAMPTZ",
  "INTERVAL '15 minutes'", "listing_videos_storage_insert_issued_intent", "can_insert_own_listing_video_from_active_intent",
  "issue_own_listing_video_upload_intent", "finalize_own_listing_video_upload_intent", "replace_own_listing_video_upload_intent",
  "REVOKE EXECUTE ON FUNCTION public.attach_own_listing_video", "REVOKE EXECUTE ON FUNCTION public.replace_own_listing_video"
]) assert.ok(migration.includes(token), token);

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["dealer", "other", "individual", "listing", "otherListing", "vehicle", "otherVehicle", "make", "model"].map((key) => [key, randomUUID()]));
const claim = (sub) => `RESET ROLE; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '{"role":"authenticated","sub":"${sub}"}';`;
const pathFor = (owner, listing, file) => `${owner}/prod04a-2026082801/${listing}/${file}`;

const setup = `
INSERT INTO auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
('00000000-0000-0000-0000-000000000000','${ids.dealer}','authenticated','authenticated','b1-${ids.dealer}@test.invalid','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','${ids.other}','authenticated','authenticated','b1-${ids.other}@test.invalid','{}','{}',now(),now()),
('00000000-0000-0000-0000-000000000000','${ids.individual}','authenticated','authenticated','b1-${ids.individual}@test.invalid','{}','{}',now(),now());
SET LOCAL ROLE service_role;
UPDATE public.profiles SET seller_type='dealer' WHERE id IN ('${ids.dealer}','${ids.other}');
INSERT INTO marketplace.galeri_verifications(dealer_id,status,reviewed_at,reviewed_by) VALUES ('${ids.dealer}','verified',now(),'${ids.dealer}'),('${ids.other}','verified',now(),'${ids.other}');
INSERT INTO vehicle.makes(id,name,slug) VALUES ('${ids.make}','B1 Make','b1-${ids.make}');
INSERT INTO vehicle.models(id,make_id,name,slug) VALUES ('${ids.model}','${ids.make}','B1 Model','b1-${ids.model}');
INSERT INTO vehicle.vehicle_profiles(id,make_id,model_id,year,mileage_km,fuel_type,transmission,created_source,profile_status,created_by) VALUES
('${ids.vehicle}','${ids.make}','${ids.model}',2024,1,'gasoline','automatic','manual','active','${ids.dealer}'),('${ids.otherVehicle}','${ids.make}','${ids.model}',2024,1,'gasoline','automatic','manual','active','${ids.other}');
INSERT INTO vehicle.profile_ownership(vehicle_profile_id,owner_id,ownership_type,is_current) VALUES ('${ids.vehicle}','${ids.dealer}','owner',true),('${ids.otherVehicle}','${ids.other}','owner',true);
INSERT INTO marketplace.listings(id,vehicle_profile_id,seller_id,status,moderation_status,title,price_amount,currency,price_negotiable,city,seller_type) VALUES
('${ids.listing}','${ids.vehicle}','${ids.dealer}','active','active','B1 listing',1,'TRY',false,'Istanbul','dealer'),('${ids.otherListing}','${ids.otherVehicle}','${ids.other}','active','active','B1 other',1,'TRY',false,'Istanbul','dealer');`;

const sql = `BEGIN; ${setup}
CREATE TEMP TABLE results(name text PRIMARY KEY, ok boolean NOT NULL) ON COMMIT DROP; GRANT SELECT, INSERT ON results TO authenticated, service_role;
INSERT INTO results VALUES ('intent table private', NOT has_table_privilege('authenticated','marketplace.listing_video_upload_intents','SELECT,INSERT,UPDATE,DELETE'));
INSERT INTO results VALUES ('old attach revoked', NOT has_function_privilege('authenticated','public.attach_own_listing_video(uuid,text,text,text,integer)','EXECUTE'));
INSERT INTO results VALUES ('old replace revoked', NOT has_function_privilege('authenticated','public.replace_own_listing_video(uuid,text,text,text,integer)','EXECUTE'));
${claim(ids.dealer)}
SELECT * INTO TEMP TABLE issued FROM public.issue_own_listing_video_upload_intent('${ids.listing}','create','video/mp4',100);
GRANT SELECT ON issued TO service_role;
INSERT INTO results VALUES ('issued canonical unique path', EXISTS (SELECT 1 FROM issued WHERE object_path = '${ids.dealer}/prod04a-2026082801/${ids.listing}/' || intent_id::text || '.mp4' AND expires_at > now() AND expires_at <= now() + interval '16 minutes'));
DO $$ BEGIN BEGIN PERFORM public.issue_own_listing_video_upload_intent('${ids.listing}','create','image/png',100); INSERT INTO results VALUES ('invalid MIME denied',false); EXCEPTION WHEN SQLSTATE 'OT422' THEN INSERT INTO results VALUES ('invalid MIME denied',true); END; END $$;
DO $$ BEGIN BEGIN PERFORM public.issue_own_listing_video_upload_intent('${ids.listing}','create','video/mp4',104857601); INSERT INTO results VALUES ('oversized denied',false); EXCEPTION WHEN SQLSTATE 'OT422' THEN INSERT INTO results VALUES ('oversized denied',true); END; END $$;
DO $$ BEGIN BEGIN PERFORM public.issue_own_listing_video_upload_intent('${ids.otherListing}','create','video/mp4',100); INSERT INTO results VALUES ('cross owner denied',false); EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO results VALUES ('cross owner denied',true); END; END $$;
INSERT INTO results VALUES ('arbitrary path no active intent', NOT marketplace.can_insert_own_listing_video_from_active_intent('${pathFor(ids.dealer, ids.listing, "arbitrary.mp4")}'));
INSERT INTO results VALUES ('issued path active', marketplace.can_insert_own_listing_video_from_active_intent((SELECT object_path FROM issued)));
SET LOCAL ROLE service_role; INSERT INTO storage.objects(bucket_id,name,owner_id) SELECT 'listing-videos',object_path,'${ids.dealer}' FROM issued;
${claim(ids.dealer)}
SELECT public.finalize_own_listing_video_upload_intent('${ids.listing}',intent_id,'B1',NULL,1) FROM issued;
SET LOCAL ROLE service_role;
INSERT INTO results VALUES ('finalize consumes intent', EXISTS (SELECT 1 FROM marketplace.listing_video_upload_intents WHERE id=(SELECT intent_id FROM issued) AND consumed_at IS NOT NULL));
${claim(ids.dealer)}
DO $$ DECLARE v_id uuid; BEGIN SELECT intent_id INTO v_id FROM issued; BEGIN PERFORM public.finalize_own_listing_video_upload_intent('${ids.listing}',v_id,'B1',NULL,1); INSERT INTO results VALUES ('consumed reuse denied',false); EXCEPTION WHEN SQLSTATE 'OT422' THEN INSERT INTO results VALUES ('consumed reuse denied',true); END; END $$;
SET LOCAL ROLE service_role; INSERT INTO marketplace.listing_video_upload_intents(listing_id,owner_user_id,object_path,operation,mime_type,declared_size_bytes,created_at,expires_at) VALUES ('${ids.otherListing}','${ids.other}','${pathFor(ids.other, ids.otherListing, "expired.mp4")}','create','video/mp4',1,now()-interval '2 minutes',now()-interval '1 minute');
${claim(ids.other)}
INSERT INTO results VALUES ('expired upload denied', NOT marketplace.can_insert_own_listing_video_from_active_intent('${pathFor(ids.other, ids.otherListing, "expired.mp4")}'));
SELECT name,ok FROM results ORDER BY name; ROLLBACK;`;

const results = query(sql).split(/\r?\n/).filter((line) => line.includes("|")).map((line) => line.split("|"));
assert.deepEqual(results.filter(([, ok]) => ok !== "t"), [], JSON.stringify(results));
console.log(`FUNCTIONAL-03C-B1 persisted upload intent matrix passed (${results.length} checks)`);
